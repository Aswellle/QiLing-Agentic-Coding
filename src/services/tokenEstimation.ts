/**
 * Token estimation service — adapted from CC's services/tokenEstimation.ts
 *
 * Provides rough token count estimation for messages and strings.
 * CC uses the actual Anthropic count_tokens API; QiLing uses heuristic estimation
 * to avoid the API call overhead for background tasks.
 *
 * The estimate follows the rule: ~4 bytes per token for English text,
 * with adjustments for code, JSON, and CJK content.
 */

import type { Message } from '../types/message'

// ─── String-based estimation ──────────────────────────────────────────────────

/**
 * Rough token count for a plain string.
 * Matches CC's roughTokenCountEstimation() heuristic.
 */
export function roughTokenCountEstimation(text: string): number {
  if (!text) return 0

  // CJK characters use more tokens (about 1 char per 1.5 tokens on average)
  let cjkCount = 0
  let asciiCount = 0

  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    if (code >= 0x4e00 && code <= 0x9fff) cjkCount++
    else if (code >= 0x20) asciiCount++
  }

  // CJK: ~1.5 tokens/char (higher token density)
  // ASCII: ~4 chars/token
  return Math.ceil(cjkCount * 1.5 + asciiCount / 4)
}

// ─── Message-based estimation ─────────────────────────────────────────────────

function extractMessageText(msg: Message): string {
  if (typeof msg.content === 'string') return msg.content
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map(b => b.text)
      .join('')
  }
  return ''
}

/**
 * Estimate token count for an array of messages.
 * Adds overhead for message structure (role, separators, etc.).
 */
export function roughTokenCountEstimationForMessages(messages: Message[]): number {
  let total = 0
  for (const msg of messages) {
    // Per-message overhead (role token + formatting)
    total += 4
    total += roughTokenCountEstimation(extractMessageText(msg))
  }
  // System-level overhead
  total += 3
  return total
}

/**
 * Estimate tokens for a system prompt string.
 */
export function estimateSystemPromptTokens(systemPrompt: string): number {
  return roughTokenCountEstimation(systemPrompt) + 10
}

// ─── Token budget helpers ─────────────────────────────────────────────────────

/**
 * Get the context window size for a model.
 * Returns 200_000 for Claude 4.x models, 100_000 for older models.
 */
export function getContextWindowForModel(model: string): number {
  const lower = model.toLowerCase()
  if (
    lower.includes('claude-opus-4') ||
    lower.includes('claude-sonnet-4') ||
    lower.includes('claude-haiku-4') ||
    lower.includes('claude-3-5')
  ) {
    return 200_000
  }
  if (lower.includes('claude-3')) return 100_000
  return 200_000  // Default for unknown models
}

/**
 * Calculate what percentage of the context window has been used.
 */
export function contextUsagePercent(
  messages: Message[],
  systemPrompt: string,
  model: string,
): number {
  const windowSize = getContextWindowForModel(model)
  const used = roughTokenCountEstimationForMessages(messages) +
               estimateSystemPromptTokens(systemPrompt)
  return Math.min(100, Math.round((used / windowSize) * 100))
}

/**
 * Check if we're approaching the context limit.
 * Returns true if usage is above the warning threshold.
 */
export function isNearContextLimit(
  messages: Message[],
  systemPrompt: string,
  model: string,
  threshold = 0.75,
): boolean {
  return contextUsagePercent(messages, systemPrompt, model) / 100 >= threshold
}
