/**
 * Message utilities — ported from CC's utils/messages.ts (targeted subset)
 *
 * Key message constants (CC-aligned):
 * - INTERRUPT_MESSAGE, CANCEL_MESSAGE, REJECT_MESSAGE, NO_RESPONSE_REQUESTED
 *
 * Key functions:
 * - stripThinkingBlocks(): remove thinking blocks when credentials change
 * - filterMetaMessages(): remove isMeta messages for session display/export
 * - extractTextContent(): get text from a message's content blocks
 */

import type { Message, ContentBlock } from '../types/message'

// ─── Thinking block detection ─────────────────────────────────────────────────

function isThinkingBlock(block: ContentBlock): boolean {
  // @ts-expect-error — thinking/redacted_thinking are valid API blocks but not in our ContentBlock type
  return block.type === 'thinking' || block.type === 'redacted_thinking'
}

/**
 * Strip thinking/redacted_thinking blocks from all assistant messages.
 * Their cryptographic signatures are bound to the API key that generated them;
 * after a credential change (e.g., switching providers) the API rejects them.
 *
 * Mirrors CC's stripSignatureBlocks() from utils/messages.ts.
 */
export function stripThinkingBlocks(messages: Message[]): Message[] {
  return messages.map(msg => {
    if (msg.role !== 'assistant') return msg
    if (typeof msg.content === 'string') return msg
    if (!Array.isArray(msg.content)) return msg

    const filtered = msg.content.filter(b => !isThinkingBlock(b))
    if (filtered.length === msg.content.length) return msg

    // Return message without thinking blocks; empty content is handled by the API
    return { ...msg, content: filtered.length > 0 ? filtered : msg.content }
  })
}

// ─── Message filtering ────────────────────────────────────────────────────────

/** Filter out isMeta messages for display/export purposes. */
export function filterMetaMessages(messages: Message[]): Message[] {
  return messages.filter(m => !m.isMeta)
}

/**
 * Filter messages safe to send to the API:
 * - Remove isMeta messages that shouldn't be in conversation history
 * - Ensure thinking blocks are only in messages where they're valid
 */
export function normalizeForAPI(messages: Message[]): Message[] {
  return messages.filter(m => !m.isMeta)
}

// ─── Content extraction ───────────────────────────────────────────────────────

/** Extract all text content from a message as a single string. */
export function extractTextContent(content: Message['content']): string {
  if (typeof content === 'string') return content
  return content
    .filter(b => b.type === 'text')
    .map(b => (b as { text: string }).text)
    .join('\n')
}

/** Get the last assistant message's text, or undefined if none. */
export function getLastAssistantText(messages: Message[]): string | undefined {
  const last = [...messages].reverse().find(m => m.role === 'assistant' && !m.isMeta)
  if (!last) return undefined
  return extractTextContent(last.content) || undefined
}

// ─── Message counting ─────────────────────────────────────────────────────────

/** Count tool calls across a conversation. */
export function countToolCalls(messages: Message[]): number {
  let count = 0
  for (const msg of messages) {
    if (typeof msg.content === 'string') continue
    for (const block of msg.content) {
      if (block.type === 'tool_use') count++
    }
  }
  return count
}

/** Count user turns (non-meta user messages). */
export function countUserTurns(messages: Message[]): number {
  return messages.filter(m => m.role === 'user' && !m.isMeta).length
}

// ─── CC-aligned message constants ────────────────────────────────────────────

/** User interrupted the request (Ctrl+C). */
export const INTERRUPT_MESSAGE = '[Request interrupted by user]'

/** User interrupted during tool use (tool call was NOT executed). */
export const INTERRUPT_MESSAGE_FOR_TOOL_USE = '[Request interrupted by user for tool use]'

/** User declined to take the suggested action. Model should wait for instructions. */
export const CANCEL_MESSAGE =
  "The user doesn't want to take this action right now. STOP what you are doing and wait for the user to tell you how to proceed."

/** User rejected a specific tool use. Model should stop and wait. */
export const REJECT_MESSAGE =
  "The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file). STOP what you are doing and wait for the user to tell you how to proceed."

export const REJECT_MESSAGE_WITH_REASON_PREFIX =
  "The user doesn't want to proceed with this tool use and provided the following reason: "

/** Tool result placeholder when no response was requested (silent tool use). */
export const NO_RESPONSE_REQUESTED = 'No response requested.'

export function AUTO_REJECT_MESSAGE(toolName: string): string {
  return `${toolName} was not executed because auto-mode rejected it. The user has not approved this type of tool use.`
}

export function DONT_ASK_REJECT_MESSAGE(toolName: string): string {
  return `${toolName} was not executed because the user chose to never ask for this permission.`
}

// ─── Compact boundary utilities (CC's getMessagesAfterCompactBoundary) ────────

/**
 * Find the index of the last SystemCompactBoundary message.
 * Returns -1 if no compact boundary found.
 */
function findLastCompactBoundaryIndex(messages: Message[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    // Check for CC-style compact boundary marker
    if (
      (msg as { type?: string }).type === 'system' &&
      typeof (msg as { content?: unknown }).content === 'string' &&
      ((msg as { content: string }).content.includes('COMPACT_BOUNDARY') ||
       (msg as { content: string }).content.includes('compact-boundary'))
    ) {
      return i
    }
    // Also check for isMeta messages with compact indicator
    if ((msg as { isMeta?: boolean; isCompactSummary?: boolean }).isCompactSummary) {
      return i
    }
  }
  return -1
}

/**
 * Get messages after the last compact boundary (or all messages if no boundary).
 * Used by SessionMemory, MagicDocs, extractMemories to focus on recent context.
 *
 * Mirrors CC's getMessagesAfterCompactBoundary() from utils/messages.ts.
 */
export function getMessagesAfterCompactBoundary(messages: Message[]): Message[] {
  const boundaryIndex = findLastCompactBoundaryIndex(messages)
  return boundaryIndex === -1 ? messages : messages.slice(boundaryIndex)
}

// ─── Additional message utilities ────────────────────────────────────────────

/** Marker for synthetic model (non-real API calls, e.g. tool-use summaries) */
export const SYNTHETIC_MODEL = '<synthetic>'

/**
 * Check if a message contains tool calls (tool_use blocks).
 * Mirrors CC's hasToolCallsInLastAssistantTurn().
 */
export function hasToolCallsInLastAssistantTurn(messages: Message[]): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role !== 'assistant') continue
    if (Array.isArray(msg.content)) {
      return msg.content.some((b: { type: string }) => b.type === 'tool_use')
    }
    return false
  }
  return false
}

/**
 * Get the text content from the last assistant message.
 * Returns null if the last message is not from assistant or has no text.
 */
export function getAssistantMessageText(messages: Message[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role !== 'assistant') continue
    const text = extractTextContent(msg.content)
    return text || null
  }
  return null
}

/**
 * Create a simple user message (mirrors CC's createUserMessage).
 */
export function createUserMessage(content: string, opts?: { isMeta?: boolean }): Message {
  return {
    role: 'user' as const,
    content,
    ...(opts?.isMeta ? { isMeta: true } : {}),
  }
}

/**
 * Extract content between XML-style tags. Supports nested same-type tags.
 * Returns null if the tag is not found or content is empty.
 *
 * Ported from CC's utils/messages.ts extractTag()
 *
 * @example
 * extractTag('<bash-input>ls -la</bash-input>', 'bash-input') // 'ls -la'
 * extractTag('<status>completed</status>', 'status')          // 'completed'
 */
export function extractTag(html: string, tagName: string): string | null {
  if (!html.trim() || !tagName.trim()) return null

  const esc = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(
    `<${esc}(?:\\s+[^>]*)?>` + '([\\s\\S]*?)' + `<\\/${esc}>`,
    'gi',
  )
  const openingTag = new RegExp(`<${esc}(?:\\s+[^>]*?)?>`, 'gi')
  const closingTag = new RegExp(`<\\/${esc}>`, 'gi')

  let match: RegExpExecArray | null
  let lastIndex = 0
  while ((match = pattern.exec(html)) !== null) {
    const content = match[1]
    const beforeMatch = html.slice(lastIndex, match.index)
    let depth = 0
    openingTag.lastIndex = 0
    while (openingTag.exec(beforeMatch) !== null) depth++
    closingTag.lastIndex = 0
    while (closingTag.exec(beforeMatch) !== null) depth--
    if (depth === 0 && content) return content
    lastIndex = match.index + match[0].length
  }
  return null
}

// FROM CC: getLastAssistantMessage — find the last assistant message
import type { Message } from "../types/message.js";
export function getLastAssistantMessage(messages: Message[]): Message | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "assistant") return messages[i];
  }
  return undefined;
}

