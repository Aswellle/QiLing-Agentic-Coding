/**
 * Message grouping utilities — ported from CC's services/compact/grouping.ts
 *
 * Groups messages at API-round boundaries for use in compaction.
 * A boundary fires when a new assistant response begins.
 */

import type { Message } from '../../types/message'

/**
 * Groups messages at API-round boundaries (one group per API round-trip).
 * Mirrors CC's groupMessagesByApiRound() from services/compact/grouping.ts.
 *
 * Used by compaction to identify which tool rounds can be collapsed.
 */
export function groupMessagesByApiRound(messages: Message[]): Message[][] {
  const groups: Message[][] = []
  let current: Message[] = []
  let lastAssistantSeen = false

  for (const msg of messages) {
    // New assistant message after previous assistant = new round boundary
    if (msg.role === 'assistant' && lastAssistantSeen && current.length > 0) {
      groups.push(current)
      current = [msg]
    } else {
      current.push(msg)
    }
    if (msg.role === 'assistant') lastAssistantSeen = true
  }

  if (current.length > 0) groups.push(current)
  return groups
}
