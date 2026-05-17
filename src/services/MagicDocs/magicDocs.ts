/**
 * Magic Docs — ported from CC's services/MagicDocs/magicDocs.ts
 *
 * Automatically maintains markdown documentation files marked with
 * "# MAGIC DOC: [title]" headers. When such a file is read via FileReadTool,
 * it's tracked and periodically updated by a background AI call to incorporate
 * learnings from the current conversation.
 *
 * CC uses runAgent for updates. QiLing adaptation: provider.stream() + simple
 * text replacement instead of FileEdit tool calls.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import type { Message } from '../../types/message'
import type { Provider } from '../../types/provider'
import { buildMagicDocsUpdatePrompt } from './prompts'

// ─── Magic Doc detection ──────────────────────────────────────────────────────

const MAGIC_DOC_HEADER_RE = /^#\s*MAGIC\s+DOC:\s*(.+)$/im
const ITALICS_RE = /^[_*](.+?)[_*]\s*$/m

export type MagicDocInfo = {
  path: string
  title: string
  instructions?: string
}

/**
 * Detect if file content contains a Magic Doc header.
 * Returns { title, instructions? } or null.
 */
export function detectMagicDocHeader(
  content: string,
): { title: string; instructions?: string } | null {
  const match = content.match(MAGIC_DOC_HEADER_RE)
  if (!match?.[1]) return null

  const title = match[1].trim()
  const headerEndIdx = match.index! + match[0].length
  const afterHeader = content.slice(headerEndIdx)
  const nextLineMatch = afterHeader.match(/^\s*\n(?:\s*\n)?(.+?)(?:\n|$)/)

  if (nextLineMatch?.[1]) {
    const italicsMatch = nextLineMatch[1].match(ITALICS_RE)
    if (italicsMatch?.[1]) {
      return { title, instructions: italicsMatch[1].trim() }
    }
  }

  return { title }
}

// ─── Tracking state ───────────────────────────────────────────────────────────

const trackedDocs = new Map<string, MagicDocInfo>()
let _updating = false

export function clearTrackedMagicDocs(): void {
  trackedDocs.clear()
}

/**
 * Register a file as a Magic Doc after reading it.
 * Called from FileReadTool when a magic doc header is detected.
 */
export function registerMagicDoc(filePath: string, info: { title: string; instructions?: string }): void {
  if (!isMagicDocsEnabled()) return
  trackedDocs.set(filePath, { path: filePath, ...info })
  if (process.env.QILING_DEBUG === '1') {
    console.error(`[MagicDocs] Tracking: ${filePath} ("${info.title}")`)
  }
}

export function getTrackedMagicDocs(): Map<string, MagicDocInfo> {
  return trackedDocs
}

// ─── Update logic ─────────────────────────────────────────────────────────────

type UpdateResult = { shouldUpdate: boolean; updates?: Array<{ oldText: string; newText: string }> }

function applyTextReplacements(content: string, updates: Array<{ oldText: string; newText: string }>): string {
  let result = content
  for (const { oldText, newText } of updates) {
    if (result.includes(oldText)) {
      result = result.replace(oldText, newText)
    }
  }
  return result
}

function buildConversationContext(messages: Message[]): string {
  return messages
    .filter(m => (m.role === 'user' || m.role === 'assistant') && !(m as { isMeta?: boolean }).isMeta)
    .slice(-20)
    .map(m => {
      const role = m.role === 'user' ? 'Human' : 'Assistant'
      const text = typeof m.content === 'string'
        ? m.content
        : Array.isArray(m.content)
          ? m.content.filter((b): b is { type: 'text'; text: string } => b.type === 'text').map(b => b.text).join(' ')
          : ''
      return `${role}: ${text.slice(0, 400)}`
    })
    .join('\n\n')
}

async function updateMagicDoc(
  doc: MagicDocInfo,
  messages: Message[],
  provider: Provider,
  signal?: AbortSignal,
): Promise<void> {
  let currentContent: string
  try {
    currentContent = readFileSync(doc.path, 'utf-8')
  } catch {
    return  // File may have been deleted
  }

  const conversationContext = buildConversationContext(messages)
  const prompt = buildMagicDocsUpdatePrompt(doc.path, doc.title, currentContent, doc.instructions)
  const userContent = `${conversationContext}\n\n---\n\n${prompt}`

  try {
    const stream = provider.stream(
      [{ role: 'user', content: userContent }],
      [],
      {
        systemPrompt: 'You are a documentation assistant. Output only valid JSON as instructed.',
        maxTokens: 1000,
      }
    )

    let responseText = ''
    for await (const chunk of stream) {
      if (signal?.aborted) return
      if (chunk.type === 'text_delta') responseText += chunk.text
      if (chunk.type === 'stop') break
    }

    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return

    const result = JSON.parse(jsonMatch[0]) as UpdateResult
    if (!result.shouldUpdate || !result.updates?.length) return

    const updated = applyTextReplacements(currentContent, result.updates)
    if (updated !== currentContent) {
      writeFileSync(doc.path, updated, 'utf-8')
      if (process.env.QILING_DEBUG === '1') {
        console.error(`[MagicDocs] Updated: ${doc.path}`)
      }
    }
  } catch {
    // Best-effort, never surface errors
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function isMagicDocsEnabled(): boolean {
  if (process.env.QILING_MAGIC_DOCS === '0') return false
  return process.env.QILING_MAGIC_DOCS === '1'  // opt-in
}

/**
 * Check if any tracked magic docs need updating and trigger background updates.
 * Call this after each complete query turn (similar to extractMemories).
 */
export function maybeUpdateMagicDocs(
  messages: Message[],
  provider: Provider,
  hasToolCalls: boolean,
  signal?: AbortSignal,
): void {
  if (!isMagicDocsEnabled()) return
  if (!hasToolCalls || trackedDocs.size === 0) return
  if (_updating || signal?.aborted) return

  _updating = true
  void Promise.allSettled(
    Array.from(trackedDocs.values()).map(doc =>
      updateMagicDoc(doc, messages, provider, signal)
    )
  ).finally(() => { _updating = false })
}
