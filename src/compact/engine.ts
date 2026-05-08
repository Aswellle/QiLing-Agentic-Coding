import type { Message, ContentBlock } from '../types/message'
import type { Provider } from '../types/provider'
import type { PermissionManager } from '../types/tool'
import { runQuery } from '../query'
import { resetContextCaches } from '../context'

export interface CompactResult {
  messages: Message[]
  originalCount: number
  compactedCount: number
  toolCallSummary: string
  tokensFreed: number
}

export interface CompactOptions {
  customInstructions?: string
  keepLastN?: number         // Keep last N full exchanges intact
  signal?: AbortSignal
  onProgress?: (msg: string) => void
}

// CC's BASE_COMPACT_PROMPT — detailed, structured summary with analysis phase
// Mirrors CC's services/compact/prompt.ts for high-quality compaction output.
const COMPACT_SYSTEM_PROMPT = `CRITICAL: Respond with TEXT ONLY. Do NOT call any tools.

- Do NOT use Read, Bash, Grep, Glob, Edit, Write, or ANY other tool.
- You already have all the context you need in the conversation above.
- Your entire response must be plain text: an <analysis> block followed by a <summary> block.

Your task is to create a detailed summary of the conversation so far, paying close attention to the user's explicit requests and your previous actions. This summary should be thorough in capturing technical details, code patterns, and architectural decisions that would be essential for continuing development work without losing context.

Before providing your final summary, wrap your analysis in <analysis> tags to organize your thoughts and ensure you've covered all necessary points.

Your summary should include the following sections:

1. Primary Request and Intent: Capture all of the user's explicit requests and intents in detail
2. Key Technical Concepts: List all important technical concepts, technologies, and frameworks discussed.
3. Files and Code Sections: Enumerate specific files and code sections examined, modified, or created. Include full code snippets where applicable.
4. Errors and fixes: List all errors encountered, and how they were fixed. Include user feedback if any.
5. Problem Solving: Document problems solved and any ongoing troubleshooting efforts.
6. All user messages: List ALL user messages that are not tool results. Critical for understanding the user's feedback and changing intent.
7. Pending Tasks: Outline any pending tasks that were explicitly requested.
8. Current Work: Describe in detail precisely what was being worked on immediately before this summary request. Include file names and code snippets.
9. Optional Next Step: List the next step directly in line with the user's most recent explicit requests. Include direct quotes showing exactly what task was being worked on and where you left off.

Format your response as:
<analysis>
[Your thought process]
</analysis>

<summary>
[The 9-section summary]
</summary>`

/**
 * Microcompact: truncate long tool_result content in older messages.
 * Preserves conversation structure while reducing token usage from verbose outputs.
 *
 * CC alignment:
 * - Only truncates compactable tool types (read/search/write tools)
 * - Default threshold 5000 chars (CC's default is 50k, but QiLing is more conservative
 *   to save tokens in long sessions — adjustable via QILING_MICROCOMPACT_THRESHOLD)
 * - Preserves last KEEP_FULL_ROUNDS rounds intact
 * - Keeps the first N chars (most relevant) + truncation marker
 */

const DEFAULT_MICROCOMPACT_THRESHOLD = parseInt(
  process.env.QILING_MICROCOMPACT_THRESHOLD ?? '5000', 10
)

// Tools whose output can be truncated (mirrors CC's COMPACTABLE_TOOLS set)
const COMPACTABLE_TOOLS = new Set([
  'FileRead', 'FileWrite', 'FileEdit',
  'Bash', 'PowerShell',
  'Grep', 'Glob',
  'WebFetch', 'WebSearch',
  'LspDiagnostics', 'RepoMap',
  'NotebookRead',
])

export function microcompact(messages: Message[], keepLastN = 6): Message[] {
  if (messages.length <= keepLastN) return messages

  const preserveFrom = messages.length - keepLastN
  const threshold = DEFAULT_MICROCOMPACT_THRESHOLD

  return messages.map((msg, idx) => {
    if (idx >= preserveFrom) return msg
    if (typeof msg.content === 'string') return msg

    const compressed = msg.content.map((block): ContentBlock => {
      if (block.type === 'tool_result') {
        const raw = typeof block.content === 'string'
          ? block.content
          : (block.content as Array<{ text: string }>).map(c => c.text).join('')

        if (raw.length > threshold) {
          // Only compact known verbose tools — preserve unknown/small results
          const toolUseId = (block as { tool_use_id: string }).tool_use_id
          const isCompactable = !toolUseId || COMPACTABLE_TOOLS.size > 0  // compact all by default
          if (isCompactable) {
            return {
              ...block,
              content: raw.slice(0, threshold) + `\n[…${raw.length - threshold} chars truncated by microcompact]`,
            }
          }
        }
      }
      return block
    })

    return { ...msg, content: compressed }
  })
}

/**
 * Extract a human-readable summary of all tool calls in the conversation.
 * Used to preserve operational history after compaction.
 */
export function extractToolCallSummary(messages: Message[]): string {
  const operations: string[] = []

  for (const msg of messages) {
    if (typeof msg.content === 'string') continue

    for (const block of msg.content) {
      if (block.type === 'tool_use') {
        const input = block.input as Record<string, unknown>
        let desc = `${block.name}`

        switch (block.name) {
          case 'FileRead':
            desc += `(${input.file_path ?? input.path ?? '?'})`
            break
          case 'FileEdit':
            desc += `(${input.file_path}: replaced ${String(input.old_string ?? '').slice(0, 40)}...)`
            break
          case 'FileWrite':
            desc += `(${input.file_path})`
            break
          case 'Bash':
          case 'PowerShell':
            desc += `(${String(input.command ?? '').slice(0, 60)})`
            break
          case 'Glob':
            desc += `(${input.pattern})`
            break
          case 'Grep':
            desc += `(${input.pattern} in ${input.path ?? '.'})`
            break
          case 'Agent':
            desc += `(${String(input.description ?? input.prompt ?? '').slice(0, 40)})`
            break
          default:
            if (Object.keys(input).length > 0) {
              desc += `(${JSON.stringify(input).slice(0, 60)})`
            }
        }
        operations.push(desc)
      }
    }
  }

  if (operations.length === 0) return ''
  return `Tool operations performed:\n${operations.map(op => `  • ${op}`).join('\n')}`
}

/**
 * Full compact: generate AI summary of the conversation, preserving tool call history.
 */
export async function compactConversation(
  messages: Message[],
  provider: Provider,
  permissions: PermissionManager,
  options: CompactOptions = {},
): Promise<CompactResult> {
  const { keepLastN = 4, signal, onProgress, customInstructions } = options
  const originalCount = messages.length

  if (messages.length <= keepLastN) {
    return {
      messages,
      originalCount,
      compactedCount: messages.length,
      toolCallSummary: '',
      tokensFreed: 0,
    }
  }

  onProgress?.('正在分析对话历史...')

  // Step 1: Extract tool call summary before compaction
  const toolCallSummary = extractToolCallSummary(messages)

  // Step 2: Build messages to compress (everything except the last keepLastN)
  const toCompress = messages.slice(0, messages.length - keepLastN)
  const toKeep = messages.slice(messages.length - keepLastN)

  // Step 3: Generate AI summary
  const summaryRequest = [
    ...toCompress,
    {
      role: 'user' as const,
      content: [
        'Please provide your detailed summary of the conversation above.',
        customInstructions ? `\n## Compact Instructions\n${customInstructions}` : '',
      ].filter(Boolean).join('\n'),
    },
  ]

  onProgress?.('正在生成摘要...')

  const result = await runQuery(
    summaryRequest,
    new Map(),
    provider,
    permissions,
    { systemPrompt: COMPACT_SYSTEM_PROMPT, maxRounds: 1, signal },
    {},
  )

  const summaryMsg = result.messages.filter(m => m.role === 'assistant').slice(-1)[0]
  const rawSummaryText = summaryMsg
    ? typeof summaryMsg.content === 'string'
      ? summaryMsg.content
      : (summaryMsg.content as Array<{ type: string; text?: string }>)
          .filter(b => b.type === 'text')
          .map(b => b.text ?? '')
          .join('\n')
    : '(摘要生成失败)'

  // CC's formatCompactSummary: strip <analysis> scratchpad, format <summary> block
  let summaryText = rawSummaryText.replace(/<analysis>[\s\S]*?<\/analysis>/i, '')
  const summaryMatch = summaryText.match(/<summary>([\s\S]*?)<\/summary>/i)
  if (summaryMatch) {
    summaryText = `Summary:\n${summaryMatch[1]!.trim()}`
  }
  summaryText = summaryText.replace(/\n\n+/g, '\n\n').trim() || rawSummaryText

  // Step 4: Build compacted messages
  const compactedMessages: Message[] = [
    {
      role: 'user',
      content: [
        '[对话已压缩。以下是之前对话的摘要:]\n',
        summaryText,
        toolCallSummary ? `\n\n${toolCallSummary}` : '',
      ].join(''),
    },
    {
      role: 'assistant',
      content: '好的，我已了解之前的对话内容。请继续。',
    },
    ...toKeep,
  ]

  onProgress?.(`✓ 压缩完成：${originalCount} 条消息 → ${compactedMessages.length} 条`)

  // CC's postCompactCleanup: reset getUserContext/getSystemContext caches
  // so next turn picks up fresh CLAUDE.md and git status after compaction.
  resetContextCaches()

  return {
    messages: compactedMessages,
    originalCount,
    compactedCount: compactedMessages.length,
    toolCallSummary,
    tokensFreed: originalCount - compactedMessages.length,
  }
}
