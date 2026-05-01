import type { TokenUsage } from '../types/message'

/** Pricing per 1M tokens in USD */
interface ModelPricing {
  input: number    // per 1M input tokens
  output: number   // per 1M output tokens
  cacheRead?: number
  cacheWrite?: number
}

// Reference pricing (update as providers change rates)
const PRICING: Record<string, ModelPricing> = {
  // Anthropic
  'claude-opus-4-7': { input: 15.0, output: 75.0, cacheRead: 1.5, cacheWrite: 18.75 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0, cacheRead: 0.08, cacheWrite: 1.0 },
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0, cacheRead: 0.3, cacheWrite: 3.75 },
  // OpenAI
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  // MiniMax (estimated, check docs.minimax.io for current rates)
  'MiniMax-Text-01': { input: 1.0, output: 4.0 },
  'abab6.5s-chat': { input: 0.3, output: 1.2 },
  // Google Gemini
  'gemini-2.0-flash': { input: 0.075, output: 0.3 },
  'gemini-1.5-pro': { input: 1.25, output: 5.0 },
}

/** USD → CNY approximate rate */
const USD_TO_CNY = 7.2

export interface CostBreakdown {
  inputCostUSD: number
  outputCostUSD: number
  cacheReadCostUSD: number
  cacheWriteCostUSD: number
  totalUSD: number
  totalCNY: number
  /** Formatted string for display, e.g. "¥0.08 (~$0.01)" */
  display: string
}

export function calculateCost(usage: TokenUsage, model: string): CostBreakdown {
  const pricing = PRICING[model]
  if (!pricing) {
    // Unknown model — return zero cost
    return { inputCostUSD: 0, outputCostUSD: 0, cacheReadCostUSD: 0, cacheWriteCostUSD: 0, totalUSD: 0, totalCNY: 0, display: '?' }
  }

  const inputCostUSD = (usage.inputTokens / 1_000_000) * pricing.input
  const outputCostUSD = (usage.outputTokens / 1_000_000) * pricing.output
  const cacheReadCostUSD = (usage.cacheReadTokens / 1_000_000) * (pricing.cacheRead ?? 0)
  const cacheWriteCostUSD = (usage.cacheWriteTokens / 1_000_000) * (pricing.cacheWrite ?? 0)
  const totalUSD = inputCostUSD + outputCostUSD + cacheReadCostUSD + cacheWriteCostUSD
  const totalCNY = totalUSD * USD_TO_CNY

  let display: string
  if (totalCNY < 0.01) {
    display = `<¥0.01`
  } else if (totalCNY < 1) {
    display = `¥${totalCNY.toFixed(3)}`
  } else {
    display = `¥${totalCNY.toFixed(2)}`
  }

  return { inputCostUSD, outputCostUSD, cacheReadCostUSD, cacheWriteCostUSD, totalUSD, totalCNY, display }
}

export function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export function formatUsageLine(usage: TokenUsage, model: string): string {
  const total = usage.inputTokens + usage.outputTokens
  const cost = calculateCost(usage, model)
  const parts = [`${formatTokenCount(total)} tokens`]
  if (cost.totalUSD > 0) parts.push(cost.display)
  if (usage.cacheReadTokens > 0) {
    parts.push(`cache↓${formatTokenCount(usage.cacheReadTokens)}`)
  }
  return parts.join(' · ')
}
