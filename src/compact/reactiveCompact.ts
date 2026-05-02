/**
 * Reactive Compact — ported from CC's services/compact/reactiveCompact.ts
 *
 * Handles automatic recovery from prompt-too-long (PTL) and media-size errors
 * by compacting the conversation and retrying the query.
 *
 * Flow (mirrors CC exactly):
 *   1. API returns PTL error → isPromptTooLong(error) = true
 *   2. query.ts withholds the error (doesn't crash)
 *   3. tryReactiveCompact() compresses messages
 *   4. query.ts retries with compacted messages
 *   5. hasAttemptedReactiveCompact = true → prevent spiral
 */

import type { Message } from '../types/message'
import type { Provider } from '../types/provider'
import type { PermissionManager } from '../types/tool'
import { compactConversation } from './engine'

// ─── Error detection ──────────────────────────────────────────────────────────

const PTL_PATTERNS = [
  /prompt.{0,10}too.{0,5}long/i,
  /context.{0,10}length.{0,10}exceeded/i,
  /context.{0,10}window.{0,10}full/i,
  /maximum.{0,10}context/i,
  /token.{0,10}limit.{0,10}exceeded/i,
  /prompt_too_long/i,
  /context_length_exceeded/i,
  /input.{0,10}is.{0,10}too.{0,10}long/i,
  // Anthropic specific
  /prompt is too long/i,
  // OpenAI specific
  /maximum context length/i,
  // Google specific
  /exceeds the maximum number of tokens/i,
]

const MEDIA_SIZE_PATTERNS = [
  /image.{0,15}too.{0,5}large/i,
  /file.{0,15}too.{0,5}large/i,
  /media.{0,15}too.{0,5}large/i,
  /payload.{0,10}too.{0,5}large/i,
]

export function isPromptTooLong(errorMessage: string): boolean {
  return PTL_PATTERNS.some(p => p.test(errorMessage))
}

export function isMediaSizeError(errorMessage: string): boolean {
  return MEDIA_SIZE_PATTERNS.some(p => p.test(errorMessage))
}

// ─── Reactive compact ─────────────────────────────────────────────────────────

export interface ReactiveCompactResult {
  messages: Message[]
  reason: 'prompt_too_long' | 'media_size'
}

/**
 * Attempt to compact the conversation to recover from a PTL / media-size error.
 *
 * Returns null if:
 *   - hasAttempted = true (prevent spiral)
 *   - messages too short to compact meaningfully
 *   - compaction itself fails
 */
export async function tryReactiveCompact(params: {
  messages: Message[]
  errorMessage: string
  hasAttempted: boolean
  provider: Provider
  permissions: PermissionManager
  signal?: AbortSignal
  onProgress?: (msg: string) => void
}): Promise<ReactiveCompactResult | null> {
  const { messages, errorMessage, hasAttempted, provider, permissions, signal, onProgress } = params

  // Guard: don't spiral
  if (hasAttempted) return null

  // Need enough messages to compact
  if (messages.length < 6) return null

  const reason: ReactiveCompactResult['reason'] = isMediaSizeError(errorMessage)
    ? 'media_size'
    : 'prompt_too_long'

  onProgress?.(`⟳ ${reason === 'prompt_too_long' ? '上下文过长' : '媒体文件过大'}，正在自动压缩…`)

  try {
    const result = await compactConversation(messages, provider, permissions, {
      customInstructions:
        'This is an emergency compact triggered by a context-too-long error. ' +
        'Aggressively summarize — be more concise than usual. ' +
        'Prioritize preserving the current task state and any uncommitted code changes.',
      signal,
      onProgress,
    })
    return { messages: result.messages, reason }
  } catch {
    return null
  }
}
