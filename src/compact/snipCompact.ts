/**
 * History snip compaction — inspired by CC's services/compact/snipCompact.ts
 *
 * Pre-compact strategy: when conversation is very long, drop the oldest
 * messages to free tokens without needing an AI summarization call.
 * Preserves: system messages, the user's initial message, recent N rounds.
 *
 * CC uses this BEFORE microcompact and autocompact to reduce the token load.
 */

import type { Message } from '../types/message'
import { roughTokenCountEstimationForMessages } from '../utils/tokens'

// Only snip when estimated tokens exceed this threshold
// (below autocompact threshold to give room for microcompact too)
const SNIP_THRESHOLD_TOKENS = parseInt(process.env.QILING_SNIP_THRESHOLD ?? '', 10) || 120_000
// Always keep the most recent N messages intact (never snip these)
const KEEP_RECENT_MESSAGES = parseInt(process.env.QILING_SNIP_KEEP_RECENT ?? '', 10) || 20

export type SnipResult = {
  messages: Message[]
  tokensFreed: number
  boundaryMessage?: Message
}

/**
 * Remove old messages when conversation depth exceeds threshold.
 * Returns the snipped messages and a boundary message if any were removed.
 * Mirrors CC's snipCompact.ts behavior (without using their implementation).
 */
export function snipCompactIfNeeded(messages: Message[]): SnipResult {
  const estimatedTokens = roughTokenCountEstimationForMessages(messages)

  if (estimatedTokens < SNIP_THRESHOLD_TOKENS) {
    return { messages, tokensFreed: 0 }
  }

  if (messages.length <= KEEP_RECENT_MESSAGES) {
    return { messages, tokensFreed: 0 }
  }

  // How many messages to remove from the beginning
  const toRemove = Math.max(0, messages.length - KEEP_RECENT_MESSAGES)
  if (toRemove === 0) return { messages, tokensFreed: 0 }

  const removed = messages.slice(0, toRemove)
  const kept = messages.slice(toRemove)

  const removedTokens = roughTokenCountEstimationForMessages(removed)
  const boundaryMessage: Message = {
    role: 'user',
    content: `[earlier conversation truncated — ${toRemove} messages removed to free ~${Math.round(removedTokens / 1000)}k estimated tokens]`,
    isMeta: true,
  }

  return {
    messages: [boundaryMessage, ...kept],
    tokensFreed: removedTokens,
    boundaryMessage,
  }
}
