/**
 * Auto-compact threshold calculation — ported from CC's services/compact/autoCompact.ts
 *
 * Determines when to trigger automatic compaction based on token usage vs
 * effective context window size.
 */

import type { TokenUsage } from '../types/message'

// CC constants (preserved verbatim)
const AUTOCOMPACT_BUFFER_TOKENS = 13_000
const WARNING_THRESHOLD_BUFFER_TOKENS = 20_000
const MAX_OUTPUT_TOKENS_RESERVED = 8_096  // reserved for model response

// Context window sizes by model prefix (mirrors CC's model table)
const CONTEXT_WINDOWS: Array<[RegExp, number]> = [
  [/claude-opus-4/i, 200_000],
  [/claude-sonnet-4/i, 200_000],
  [/claude-haiku-4/i, 200_000],
  [/claude-3-5-sonnet/i, 200_000],
  [/claude-3-5-haiku/i, 200_000],
  [/claude-3-opus/i, 200_000],
  [/gpt-4o/i, 128_000],
  [/gpt-4-turbo/i, 128_000],
  [/gpt-4/i, 8_192],
  [/gpt-3/i, 16_000],
  [/qwen-max/i, 32_000],
  [/qwen-plus/i, 32_000],
  [/qwen-turbo/i, 8_000],
  [/qwen-long/i, 1_000_000],
  [/doubao/i, 32_000],
  [/glm-4/i, 128_000],
]

function getContextWindowSize(model: string): number {
  for (const [pattern, size] of CONTEXT_WINDOWS) {
    if (pattern.test(model)) return size
  }
  return 200_000  // default: assume large
}

/** Effective window = context window minus reserved output tokens */
function getEffectiveWindowSize(model: string): number {
  return getContextWindowSize(model) - MAX_OUTPUT_TOKENS_RESERVED
}

/** Compact threshold = effective window minus buffer */
export function getAutoCompactThreshold(model: string): number {
  return getEffectiveWindowSize(model) - AUTOCOMPACT_BUFFER_TOKENS
}

/** Warning threshold = effective window minus warning buffer */
export function getWarningThreshold(model: string): number {
  return getEffectiveWindowSize(model) - WARNING_THRESHOLD_BUFFER_TOKENS
}

export type TokenWarningState =
  | { level: 'ok' }
  | { level: 'warn'; pct: number }
  | { level: 'critical'; pct: number }
  | { level: 'blocked'; pct: number }

export function calculateTokenWarningState(
  usage: TokenUsage,
  model: string
): TokenWarningState {
  const total = usage.inputTokens + usage.outputTokens + usage.cacheReadTokens
  const effective = getEffectiveWindowSize(model)

  if (effective <= 0) return { level: 'ok' }

  const pct = Math.round((total / effective) * 100)

  if (total >= effective - 3_000) return { level: 'blocked', pct }
  if (total >= getAutoCompactThreshold(model)) return { level: 'critical', pct }
  if (total >= getWarningThreshold(model)) return { level: 'warn', pct }
  return { level: 'ok' }
}

/**
 * Should autocompact trigger this iteration?
 * Returns true if usage is above the compact threshold.
 */
export function shouldAutoCompact(
  usage: TokenUsage,
  model: string,
  consecutiveFailures: number
): boolean {
  // Circuit breaker: 3 consecutive failures → stop retrying
  if (consecutiveFailures >= 3) return false

  const total = usage.inputTokens + usage.outputTokens + usage.cacheReadTokens
  return total >= getAutoCompactThreshold(model)
}
