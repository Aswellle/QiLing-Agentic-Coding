/**
 * Model cost calculation — adapted from CC's utils/modelCost.ts
 *
 * Per-model pricing (USD per million tokens) as of 2026.
 * Source: https://www.anthropic.com/pricing
 *
 * QiLing adaptation: removed CC-specific model config imports and fast mode,
 * uses simple model name matching instead.
 */

export type ModelCosts = {
  inputTokens: number           // $ per million input tokens
  outputTokens: number          // $ per million output tokens
  promptCacheWriteTokens: number
  promptCacheReadTokens: number
  webSearchRequests: number     // $ per request
}

// ─── Pricing tiers (USD per million tokens) ───────────────────────────────────

export const COST_TIER_3_15: ModelCosts = {
  inputTokens: 3, outputTokens: 15,
  promptCacheWriteTokens: 3.75, promptCacheReadTokens: 0.3,
  webSearchRequests: 0.01,
}

export const COST_TIER_5_25: ModelCosts = {
  inputTokens: 5, outputTokens: 25,
  promptCacheWriteTokens: 6.25, promptCacheReadTokens: 0.5,
  webSearchRequests: 0.01,
}

export const COST_TIER_15_75: ModelCosts = {
  inputTokens: 15, outputTokens: 75,
  promptCacheWriteTokens: 18.75, promptCacheReadTokens: 1.5,
  webSearchRequests: 0.01,
}

export const COST_TIER_30_150: ModelCosts = {
  inputTokens: 30, outputTokens: 150,
  promptCacheWriteTokens: 37.5, promptCacheReadTokens: 3,
  webSearchRequests: 0.01,
}

export const COST_HAIKU_35: ModelCosts = {
  inputTokens: 0.8, outputTokens: 4,
  promptCacheWriteTokens: 1, promptCacheReadTokens: 0.08,
  webSearchRequests: 0.01,
}

export const COST_HAIKU_45: ModelCosts = {
  inputTokens: 1, outputTokens: 5,
  promptCacheWriteTokens: 1.25, promptCacheReadTokens: 0.1,
  webSearchRequests: 0.01,
}

const DEFAULT_COST = COST_TIER_5_25

// ─── Model → pricing table ─────────────────────────────────────────────────────

const MODEL_COSTS: Record<string, ModelCosts> = {
  // Claude 4 Opus
  'claude-opus-4':           COST_TIER_15_75,
  'claude-opus-4-1':         COST_TIER_15_75,
  'claude-opus-4-5':         COST_TIER_5_25,
  'claude-opus-4-6':         COST_TIER_5_25,
  'claude-opus-4-7':         COST_TIER_5_25,
  // Claude 4 Sonnet
  'claude-sonnet-4':         COST_TIER_3_15,
  'claude-sonnet-4-5':       COST_TIER_3_15,
  'claude-sonnet-4-6':       COST_TIER_3_15,
  // Claude 4 Haiku
  'claude-haiku-4-5':        COST_HAIKU_45,
  'claude-haiku-4-5-20251001': COST_HAIKU_45,
  // Claude 3.x (legacy)
  'claude-3-5-sonnet-20241022': COST_TIER_3_15,
  'claude-3-5-haiku':        COST_HAIKU_35,
  'claude-3-opus':           COST_TIER_15_75,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalize model ID to lookup key (strip timestamps, version suffixes) */
function normalizeModelId(model: string): string {
  return model
    .toLowerCase()
    .replace(/-\d{8}$/, '')         // strip date suffix: -20251001
    .replace(/\[1m\]$/, '')         // strip 1M context tag
}

/**
 * Get pricing for a model. Falls back to DEFAULT_COST for unknown models.
 */
export function getModelCosts(model: string): ModelCosts {
  const normalized = normalizeModelId(model)

  // Exact match first
  if (MODEL_COSTS[normalized]) return MODEL_COSTS[normalized]!

  // Prefix match (e.g. "claude-opus-4-7-20260101" → "claude-opus-4-7")
  for (const [key, costs] of Object.entries(MODEL_COSTS)) {
    if (normalized.startsWith(key)) return costs
  }

  return DEFAULT_COST
}

/**
 * Calculate USD cost from token usage.
 *
 * @returns Cost in USD (not cents)
 */
export function calculateCostFromTokens(
  model: string,
  tokens: {
    inputTokens: number
    outputTokens: number
    cacheReadInputTokens?: number
    cacheCreationInputTokens?: number
  },
): number {
  const costs = getModelCosts(model)
  const M = 1_000_000  // per-million divisor

  return (
    (tokens.inputTokens * costs.inputTokens) / M +
    (tokens.outputTokens * costs.outputTokens) / M +
    ((tokens.cacheCreationInputTokens ?? 0) * costs.promptCacheWriteTokens) / M +
    ((tokens.cacheReadInputTokens ?? 0) * costs.promptCacheReadTokens) / M
  )
}

/**
 * Format a USD cost value for display.
 */
export function formatUSDCost(usd: number): string {
  if (usd < 0.001) return `$${(usd * 1000).toFixed(3)}m`
  if (usd < 1) return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(2)}`
}

/**
 * Check if model cost data is available (returns true for all models — we always
 * have at least a default).
 */
export function hasModelCostData(_model: string): boolean {
  return true
}
