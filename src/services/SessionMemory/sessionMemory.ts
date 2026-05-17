/**
 * Session Memory — ported from CC's services/SessionMemory/sessionMemory.ts
 *
 * Automatically maintains a markdown notes file about the current session.
 * Runs a background AI call (using provider.stream()) to extract and update
 * key information from the conversation without interrupting the main flow.
 *
 * CC uses runForkedAgent (a perfect fork of the main conversation).
 * QiLing adaptation: uses provider.stream() with a simplified message set.
 *
 * Notes file location: ~/.qiling/session-memory/<pid>.md
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { Message } from '../../types/message'
import type { Provider } from '../../types/provider'
import {
  DEFAULT_SESSION_MEMORY_TEMPLATE,
  buildSessionMemoryUpdatePrompt,
  getSessionMemoryInitPrompt,
} from './prompts'

// ─── Configuration ────────────────────────────────────────────────────────────

const MIN_MESSAGES_TO_INIT = 8      // At least 4 user+assistant exchanges
const MIN_TOOL_CALLS_BETWEEN_UPDATES = 3
const MAX_CONVERSATION_CHARS = 8000 // Truncate conversation for update prompt

// ─── State ────────────────────────────────────────────────────────────────────

let _toolCallsSinceUpdate = 0
let _initialized = false
let _updating = false
let _notesPath: string | null = null

export function getSessionMemoryPath(): string {
  if (_notesPath) return _notesPath
  const dir = join(homedir(), '.qiling', 'session-memory')
  mkdirSync(dir, { recursive: true })
  _notesPath = join(dir, `${process.pid}.md`)
  return _notesPath
}

export function recordToolCall(): void {
  _toolCallsSinceUpdate++
}

export function resetSessionMemoryState(): void {
  _toolCallsSinceUpdate = 0
  _initialized = false
  _updating = false
  _notesPath = null
}

/** Read current session notes (or empty template if not yet created) */
export function getCurrentSessionNotes(): string {
  const path = getSessionMemoryPath()
  if (!existsSync(path)) return DEFAULT_SESSION_MEMORY_TEMPLATE
  try { return readFileSync(path, 'utf-8') } catch { return DEFAULT_SESSION_MEMORY_TEMPLATE }
}

/** Write updated session notes to disk */
function writeSessionNotes(content: string): void {
  writeFileSync(getSessionMemoryPath(), content, 'utf-8')
}

// ─── Conversation summarizer ──────────────────────────────────────────────────

function summarizeConversation(messages: Message[]): string {
  const visible = messages.filter(
    m => (m.role === 'user' || m.role === 'assistant') &&
         !(m as { isMeta?: boolean }).isMeta
  )

  let total = 0
  const parts: string[] = []

  for (const m of visible.slice(-30).reverse()) {
    const role = m.role === 'user' ? 'Human' : 'Assistant'
    const text = typeof m.content === 'string'
      ? m.content
      : Array.isArray(m.content)
        ? m.content
            .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
            .map(b => b.text)
            .join(' ')
        : ''

    const chunk = `${role}: ${text.slice(0, 300)}`
    total += chunk.length
    if (total > MAX_CONVERSATION_CHARS) break
    parts.unshift(chunk)
  }

  return parts.join('\n\n')
}

// ─── Notes file updater ───────────────────────────────────────────────────────

type SectionUpdate = { section: string; content: string }

function applyUpdatesToNotes(notes: string, updates: SectionUpdate[]): string {
  let result = notes
  for (const { section, content } of updates) {
    // Find the section header
    const sectionIdx = result.indexOf(`\n${section}\n`)
    if (sectionIdx === -1) continue

    // Find the italic description line (starts right after header)
    const afterHeader = result.indexOf('\n', sectionIdx + 1) + 1
    const italicEnd = result.indexOf('\n', afterHeader)
    if (italicEnd === -1) continue

    // Find the next section header (or end of file)
    const nextSection = result.indexOf('\n#', italicEnd)
    const contentStart = italicEnd + 1
    const contentEnd = nextSection === -1 ? result.length : nextSection

    // Replace the content between italic line and next section
    result =
      result.slice(0, contentStart) +
      content.trim() + '\n' +
      result.slice(contentEnd)
  }
  return result
}

async function runSessionMemoryUpdate(
  messages: Message[],
  provider: Provider,
  signal?: AbortSignal,
): Promise<void> {
  if (_updating) return
  _updating = true

  try {
    const currentNotes = getCurrentSessionNotes()
    const conversation = summarizeConversation(messages)
    const notesPath = getSessionMemoryPath()

    const prompt = _initialized
      ? buildSessionMemoryUpdatePrompt(notesPath, currentNotes)
      : getSessionMemoryInitPrompt(conversation)

    const userContent = _initialized
      ? `Here is the conversation context:\n${conversation}\n\n${prompt}`
      : prompt

    const stream = provider.stream(
      [{ role: 'user', content: userContent }],
      [],
      {
        systemPrompt: 'You are a session notes assistant. Output only valid JSON as instructed.',
        maxTokens: 800,
      }
    )

    let responseText = ''
    for await (const chunk of stream) {
      if (signal?.aborted) return
      if (chunk.type === 'text_delta') responseText += chunk.text
      if (chunk.type === 'stop') break
    }

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return

    const parsed = JSON.parse(jsonMatch[0]) as { updates?: SectionUpdate[] }
    if (!parsed.updates?.length) return

    const updatedNotes = applyUpdatesToNotes(currentNotes, parsed.updates)
    writeSessionNotes(updatedNotes)

    _initialized = true
    _toolCallsSinceUpdate = 0

    if (process.env.QILING_DEBUG === '1') {
      console.error(`[SessionMemory] Updated notes at ${notesPath}`)
    }
  } catch {
    // Session memory is best-effort, never surface errors
  } finally {
    _updating = false
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Check if session memory should be updated and trigger if so.
 * Call this after each complete query turn.
 *
 * @param messages Current conversation messages
 * @param provider Provider for AI calls
 * @param toolCallCount Total tool calls in this turn
 * @param signal AbortSignal for cancellation
 */
export function maybeUpdateSessionMemory(
  messages: Message[],
  provider: Provider,
  toolCallCount = 0,
  signal?: AbortSignal,
): void {
  if (!isSessionMemoryEnabled()) return
  if (signal?.aborted) return

  _toolCallsSinceUpdate += toolCallCount

  // Need enough conversation before initializing
  const userMessages = messages.filter(m => m.role === 'user' && !(m as { isMeta?: boolean }).isMeta).length
  if (!_initialized && userMessages < MIN_MESSAGES_TO_INIT / 2) return

  // Need enough tool calls between updates
  if (_initialized && _toolCallsSinceUpdate < MIN_TOOL_CALLS_BETWEEN_UPDATES) return

  // Fire and forget — never block the main loop
  void runSessionMemoryUpdate(messages, provider, signal)
}

export function isSessionMemoryEnabled(): boolean {
  if (process.env.QILING_SESSION_MEMORY === '0') return false
  return process.env.QILING_SESSION_MEMORY === '1' || false  // opt-in by default
}

/**
 * Get the session memory content for injection into system prompt.
 * Returns null if not yet initialized or file doesn't exist.
 */
export function getSessionMemoryContent(): string | null {
  if (!isSessionMemoryEnabled()) return null
  const path = getSessionMemoryPath()
  if (!existsSync(path)) return null
  try {
    const content = readFileSync(path, 'utf-8')
    if (content === DEFAULT_SESSION_MEMORY_TEMPLATE) return null
    return content
  } catch {
    return null
  }
}
