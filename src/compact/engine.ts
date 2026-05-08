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

const COMPACT_SYSTEM_PROMPT = `You are a conversation summarizer.
Your job is to create a concise but complete summary of the conversation history.
Preserve: key decisions made, code changes performed (file names + what changed), current task state, errors encountered, and important context needed to continue the work.
Format the summary as structured bullet points, grouped by topic.
Be specific about file paths and code changes — these are critical for the developer to continue.`

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
        'Summarize the conversation above.',
        customInstructions ? `Focus particularly on: ${customInstructions}` : '',
        'Include: main goals, decisions made, code changes, current state, and what still needs to be done.',
        'Be specific about file paths and exact changes made.',
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
  const summaryText = summaryMsg
    ? typeof summaryMsg.content === 'string'
      ? summaryMsg.content
      : (summaryMsg.content as Array<{ type: string; text?: string }>)
          .filter(b => b.type === 'text')
          .map(b => b.text ?? '')
          .join('\n')
    : '(摘要生成失败)'

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
