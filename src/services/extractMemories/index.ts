/**
 * Extract durable memories from the current session transcript and write them
 * to the auto-memory directory (~/.qiling/projects/<slug>/memory/).
 *
 * Called once at the end of each complete query loop (when the model produces
 * a final response with no tool calls) via runQuery() after Stop hooks fire.
 *
 * Unlike CC's implementation which uses runForkedAgent() (a perfect fork of
 * the parent conversation sharing its prompt cache), QiLing uses a direct
 * provider.stream() call with a simplified message set: just the recent
 * conversation messages followed by the extraction instruction prompt.
 *
 * The model is asked to produce FileWrite/FileEdit tool calls targeting the
 * memory directory. We execute those writes directly without a full tool loop.
 */

import { existsSync } from 'fs'
import { writeFile, mkdir, readFile } from 'fs/promises'
import { join, basename } from 'path'
import type { Message } from '../../types/message'
import type { Provider } from '../../types/provider'
import { getAutoMemPath, isAutoMemoryEnabled } from '../memdir/paths'
import { scanMemoryFiles, formatMemoryManifest } from '../memdir/memoryScan'
import { ENTRYPOINT_NAME } from '../memdir/index'
import { buildExtractAutoOnlyPrompt } from './prompts'

// ─── Minimum conversation depth before extraction runs ────────────────────────
// Avoid extracting from trivially short sessions.
const MIN_USER_MESSAGES = 4

// ─── Guard: only one extraction running at a time ─────────────────────────────
let inProgress = false

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isModelVisibleMessage(message: Message): boolean {
  return (message.role === 'user' || message.role === 'assistant') &&
    !(message as { isMeta?: boolean }).isMeta
}

function countUserMessages(messages: Message[]): number {
  return messages.filter(m => m.role === 'user' && !((m as { isMeta?: boolean }).isMeta)).length
}

/**
 * Flatten a message's content to plain text for the extraction prompt.
 */
function flattenContent(content: Message['content']): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map(b => b.text)
    .join(' ')
}

/**
 * Build a trimmed conversation excerpt for the extraction context.
 * Takes the last N model-visible messages, truncating each to ~500 chars.
 */
function buildConversationExcerpt(messages: Message[], maxMessages = 30): string {
  const visible = messages.filter(isModelVisibleMessage).slice(-maxMessages)
  return visible
    .map(m => {
      const role = m.role === 'user' ? 'Human' : 'Assistant'
      const text = flattenContent(m.content).slice(0, 500)
      return `${role}: ${text}`
    })
    .join('\n\n')
}

// ─── File write executor ───────────────────────────────────────────────────────

interface WriteOp {
  filePath: string
  content: string
  isEdit: boolean   // true = FileEdit (patch), false = FileWrite (overwrite)
  oldString?: string
  newString?: string
}

/**
 * Parse tool_use blocks from the model response for FileWrite and FileEdit.
 * Only accepts paths inside the allowed memory directory.
 */
function parseWriteOps(
  responseText: string,
  memoryDir: string,
): WriteOp[] {
  const ops: WriteOp[] = []

  // The simplified QiLing extractor asks the model to return JSON instructions
  // rather than actual tool_use blocks (since we don't run a tool loop here).
  // We scan for JSON code blocks containing write instructions.
  //
  // Format the model is asked to use (see buildExtractSystemPrompt):
  //   ```json
  //   [
  //     { "op": "write", "path": "relative/file.md", "content": "..." },
  //     { "op": "edit",  "path": "MEMORY.md", "old": "...", "new": "..." }
  //   ]
  //   ```

  const jsonBlockRe = /```(?:json)?\n([\s\S]*?)```/g
  let match: RegExpExecArray | null

  while ((match = jsonBlockRe.exec(responseText)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim())
      const instructions = Array.isArray(parsed) ? parsed : [parsed]

      for (const instr of instructions) {
        if (typeof instr !== 'object' || instr === null) continue
        const op = instr.op as string
        const relativePath = instr.path as string
        if (typeof relativePath !== 'string') continue

        // Resolve to absolute path and verify it's inside the memory dir
        const absPath = relativePath.startsWith('/')
          ? relativePath
          : join(memoryDir, relativePath)

        if (!absPath.startsWith(memoryDir)) {
          if (process.env.QILING_DEBUG === '1') {
            process.stderr.write(`[extractMemories] rejected write outside memdir: ${absPath}\n`)
          }
          continue
        }

        if (op === 'write' && typeof instr.content === 'string') {
          ops.push({ filePath: absPath, content: instr.content, isEdit: false })
        } else if (op === 'edit' && typeof instr.old === 'string' && typeof instr.new === 'string') {
          ops.push({
            filePath: absPath,
            content: '',
            isEdit: true,
            oldString: instr.old,
            newString: instr.new,
          })
        }
      }
    } catch {
      // Not valid JSON — skip
    }
  }

  return ops
}

/**
 * Execute parsed write operations on disk.
 * Returns list of file paths that were actually written.
 */
async function executeWriteOps(ops: WriteOp[], memoryDir: string): Promise<string[]> {
  // Ensure memory dir exists
  await mkdir(memoryDir, { recursive: true })

  const written: string[] = []

  for (const op of ops) {
    try {
      if (op.isEdit && op.oldString !== undefined && op.newString !== undefined) {
        // FileEdit: read-modify-write
        let existing = ''
        try {
          existing = await readFile(op.filePath, 'utf-8')
        } catch {
          // File doesn't exist yet — treat as empty
        }
        const updated = existing.replace(op.oldString, op.newString)
        await writeFile(op.filePath, updated, 'utf-8')
      } else {
        // FileWrite: overwrite
        await writeFile(op.filePath, op.content, 'utf-8')
      }
      written.push(op.filePath)
    } catch (err) {
      if (process.env.QILING_DEBUG === '1') {
        process.stderr.write(`[extractMemories] write failed ${op.filePath}: ${err}\n`)
      }
    }
  }

  return written
}

// ─── System prompt for the extractor model call ───────────────────────────────

function buildExtractSystemPrompt(memoryDir: string): string {
  return [
    'You are a memory extraction agent. Your job is to analyze a conversation and save important facts to persistent memory files.',
    '',
    `Memory directory: ${memoryDir}`,
    '',
    'Output format: return a JSON code block with an array of write instructions. Use ONLY these operations:',
    '',
    '```json',
    '[',
    '  { "op": "write", "path": "filename.md", "content": "full file content here" },',
    '  { "op": "edit",  "path": "MEMORY.md",   "old": "exact text to replace", "new": "replacement text" }',
    ']',
    '```',
    '',
    'Rules:',
    '- Paths are relative to the memory directory (do NOT use absolute paths)',
    '- For new memory files: use "write" op with full markdown content including frontmatter',
    '- For updating MEMORY.md index: use "edit" op with exact old text and new text',
    '- If nothing worth saving: output an empty array []',
    '- Do not include any text outside the JSON code block',
  ].join('\n')
}

// ─── Core extraction logic ─────────────────────────────────────────────────────

/**
 * Run one extraction pass: call the provider with the conversation excerpt
 * and the extraction prompt, then parse and execute the write instructions.
 */
async function runExtraction(
  messages: Message[],
  provider: Provider,
  workingDir: string,
  signal?: AbortSignal,
): Promise<void> {
  const memoryDir = getAutoMemPath(workingDir)

  // Bail early if memory dir doesn't exist yet and we're in a very short session.
  // (The check is here rather than in maybeExtractMemories so the dir-existence
  // check is deferred past the cheaper guard checks.)
  if (!existsSync(memoryDir)) {
    if (process.env.QILING_DEBUG === '1') {
      process.stderr.write(`[extractMemories] memory dir not yet created, skipping: ${memoryDir}\n`)
    }
    return
  }

  const newMessageCount = messages.filter(isModelVisibleMessage).length

  // Scan existing memories to help the model avoid duplicates
  const existingMemories = formatMemoryManifest(
    await scanMemoryFiles(memoryDir, signal),
  )

  const conversationExcerpt = buildConversationExcerpt(messages)
  const extractionInstruction = buildExtractAutoOnlyPrompt(newMessageCount, existingMemories)
  const systemPrompt = buildExtractSystemPrompt(memoryDir)

  // Build the messages for the extraction call:
  // 1. The conversation excerpt as a "user" message (gives context)
  // 2. The extraction instruction as a follow-up "user" message
  const extractionMessages: Message[] = [
    {
      role: 'user',
      content: `Here is the recent conversation to analyze:\n\n${conversationExcerpt}`,
    },
    {
      role: 'assistant',
      content: 'I have reviewed the conversation. I will now extract any important memories.',
    },
    {
      role: 'user',
      content: extractionInstruction,
    },
  ]

  if (process.env.QILING_DEBUG === '1') {
    process.stderr.write(`[extractMemories] starting — ${newMessageCount} visible messages, memoryDir=${memoryDir}\n`)
  }

  let responseText = ''
  try {
    const stream = provider.stream(extractionMessages, [], {
      systemPrompt,
      maxTokens: 2048,
      temperature: 0,
    })

    for await (const chunk of stream) {
      if (signal?.aborted) return
      if (chunk.type === 'text_delta') responseText += chunk.text
      if (chunk.type === 'stop') break
      if (chunk.type === 'error') {
        if (process.env.QILING_DEBUG === '1') {
          process.stderr.write(`[extractMemories] stream error: ${chunk.error}\n`)
        }
        return
      }
    }
  } catch (err) {
    if (process.env.QILING_DEBUG === '1') {
      process.stderr.write(`[extractMemories] provider error: ${err}\n`)
    }
    return
  }

  if (!responseText.trim()) {
    if (process.env.QILING_DEBUG === '1') {
      process.stderr.write('[extractMemories] empty response, nothing to write\n')
    }
    return
  }

  // Parse and execute write operations
  const ops = parseWriteOps(responseText, memoryDir)

  if (ops.length === 0) {
    if (process.env.QILING_DEBUG === '1') {
      process.stderr.write('[extractMemories] no write ops parsed — nothing to save\n')
    }
    return
  }

  const written = await executeWriteOps(ops, memoryDir)

  if (process.env.QILING_DEBUG === '1') {
    const memoryFiles = written.filter(p => basename(p) !== ENTRYPOINT_NAME)
    process.stderr.write(
      `[extractMemories] done — ${written.length} files written, ${memoryFiles.length} memory files\n`,
    )
    for (const p of written) {
      process.stderr.write(`[extractMemories]   wrote: ${p}\n`)
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Conditionally run memory extraction at the end of a query loop.
 *
 * Guards:
 * - Auto-memory must be enabled (settings or env)
 * - At least MIN_USER_MESSAGES non-meta user messages in the conversation
 * - Memory directory must already exist (implies at least one prior session)
 * - Only one extraction runs at a time (inProgress guard)
 *
 * Called fire-and-forget from query.ts after Stop hooks complete.
 * Non-fatal: all errors are caught internally.
 */
export async function maybeExtractMemories(
  messages: Message[],
  provider: Provider,
  workingDir: string,
  settings?: { autoMemoryEnabled?: boolean },
  signal?: AbortSignal,
): Promise<void> {
  // Check auto-memory is enabled
  if (!isAutoMemoryEnabled(settings)) return

  // Require a minimum conversation depth
  if (countUserMessages(messages) < MIN_USER_MESSAGES) return

  // Check memory dir exists (skip first-ever sessions to avoid creating the dir
  // when the user hasn't set up memory yet)
  const memoryDir = getAutoMemPath(workingDir)
  if (!existsSync(memoryDir)) return

  // Prevent overlapping runs
  if (inProgress) return
  inProgress = true

  try {
    await runExtraction(messages, provider, workingDir, signal)
  } catch (err) {
    // Extraction is best-effort — never surface errors to the user
    if (process.env.QILING_DEBUG === '1') {
      process.stderr.write(`[extractMemories] unexpected error: ${err}\n`)
    }
  } finally {
    inProgress = false
  }
}
