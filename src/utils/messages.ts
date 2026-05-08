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
