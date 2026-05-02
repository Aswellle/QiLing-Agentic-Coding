/**
 * Cost tracking for QiLing sessions.
 * Pricing adapted from CC's cost-tracker.ts — model rates match Anthropic/OpenAI public pricing.
 */

export interface ModelUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  costUSD: number
}

// ─── Pricing table (USD per million tokens) ───────────────────────────────────
// Format: [inputCostPerMTok, outputCostPerMTok, cacheReadCostPerMTok, cacheWriteCostPerMTok]

const MODEL_PRICING: Record<string, [number, number, number, number]> = {
  // Claude 4.x
  'claude-opus-4-7':           [15.00,  75.00,  1.50,  18.75],
  'claude-opus-4-5':           [15.00,  75.00,  1.50,  18.75],
  'claude-sonnet-4-6':         [ 3.00,  15.00,  0.30,   3.75],
  'claude-sonnet-4-5':         [ 3.00,  15.00,  0.30,   3.75],
  'claude-haiku-4-5':          [ 0.80,   4.00,  0.08,   1.00],
  // Claude 3.x
  'claude-3-5-sonnet-20241022':[ 3.00,  15.00,  0.30,   3.75],
  'claude-3-5-haiku-20241022': [ 0.80,   4.00,  0.08,   1.00],
  'claude-3-opus-20240229':    [15.00,  75.00,  1.50,  18.75],
  // OpenAI
  'gpt-4o':                    [ 2.50,  10.00,  1.25,   0.00],
  'gpt-4o-mini':               [ 0.15,   0.60,  0.075,  0.00],
  'o1':                        [15.00,  60.00,  7.50,   0.00],
  'o1-mini':                   [ 3.00,  12.00,  1.50,   0.00],
  // Chinese providers (approximate USD equivalent)
  'qwen-max':                  [ 4.20,  12.60,  0.00,   0.00],
  'qwen-plus':                 [ 0.56,   1.68,  0.00,   0.00],
  'qwen-turbo':                [ 0.14,   0.42,  0.00,   0.00],
  'qwen-coder-turbo':          [ 0.14,   0.42,  0.00,   0.00],
  'doubao-pro-32k':            [ 0.84,   1.68,  0.00,   0.00],
  'doubao-pro-128k':           [ 1.26,   2.52,  0.00,   0.00],
  'glm-4-plus':                [ 1.40,   1.40,  0.00,   0.00],
  'glm-4-flash':               [ 0.07,   0.07,  0.00,   0.00],
}

// ─── Singleton state ──────────────────────────────────────────────────────────

const usageByModel = new Map<string, ModelUsage>()
let sessionStartTime = Date.now()
let totalApiDurationMs = 0
let totalToolDurationMs = 0
let totalLinesAdded = 0
let totalLinesRemoved = 0

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPricing(model: string): [number, number, number, number] {
  // Exact match
  if (MODEL_PRICING[model]) return MODEL_PRICING[model]
  // Prefix match (e.g. "claude-sonnet-4-6" matches "claude-sonnet-4-6-20250101")
  for (const [key, price] of Object.entries(MODEL_PRICING)) {
    if (model.startsWith(key) || key.startsWith(model)) return price
  }
  // Unknown model — charge 0 but track tokens
  return [0, 0, 0, 0]
}

function calcCost(
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
  cacheWriteTokens: number,
  pricing: [number, number, number, number]
): number {
  const [inRate, outRate, cacheReadRate, cacheWriteRate] = pricing
  return (
    (inputTokens * inRate +
     outputTokens * outRate +
     cacheReadTokens * cacheReadRate +
     cacheWriteTokens * cacheWriteRate) / 1_000_000
  )
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function addUsage(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens = 0,
  cacheWriteTokens = 0
): void {
  const pricing = getPricing(model)
  const cost = calcCost(inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, pricing)

  const existing = usageByModel.get(model) ?? {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    costUSD: 0,
  }

  usageByModel.set(model, {
    inputTokens: existing.inputTokens + inputTokens,
    outputTokens: existing.outputTokens + outputTokens,
    cacheReadTokens: existing.cacheReadTokens + cacheReadTokens,
    cacheWriteTokens: existing.cacheWriteTokens + cacheWriteTokens,
    costUSD: existing.costUSD + cost,
  })
}

export function getTotalCostUSD(): number {
  let total = 0
  for (const usage of usageByModel.values()) total += usage.costUSD
  return total
}

/** Cache hit rate = cacheReadTokens / (inputTokens + cacheReadTokens) */
export function getCacheHitRate(): number {
  let totalInput = 0
  let totalCacheRead = 0
  for (const usage of usageByModel.values()) {
    totalInput += usage.inputTokens
    totalCacheRead += usage.cacheReadTokens
  }
  const denominator = totalInput + totalCacheRead
  return denominator > 0 ? totalCacheRead / denominator : 0
}

/** Estimated cost saved from cache (cache reads ~10% of full input price → 90% saved) */
export function getCacheSavingsUSD(): number {
  let savings = 0
  for (const [model, usage] of usageByModel.entries()) {
    const [inRate] = getPricing(model)
    // Full input cost that would have been charged without cache
    const fullCost = (usage.cacheReadTokens * inRate) / 1_000_000
    // Cache read is ~10% → save ~90%
    savings += fullCost * 0.9
  }
  return savings
}

export function getUsageByModel(): Map<string, ModelUsage> {
  return new Map(usageByModel)
}

export function trackApiDuration(ms: number): void {
  totalApiDurationMs += ms
}

export function trackToolDuration(ms: number): void {
  totalToolDurationMs += ms
}

export function trackCodeChange(linesAdded: number, linesRemoved: number): void {
  totalLinesAdded += linesAdded
  totalLinesRemoved += linesRemoved
}

export function getSessionDurationMs(): number {
  return Date.now() - sessionStartTime
}

export function resetSession(): void {
  usageByModel.clear()
  sessionStartTime = Date.now()
  totalApiDurationMs = 0
  totalToolDurationMs = 0
  totalLinesAdded = 0
  totalLinesRemoved = 0
}

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatCostUSD(usd: number): string {
  if (usd < 0.001) return '<$0.001'
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  if (usd < 1) return `$${usd.toFixed(3)}`
  return `$${usd.toFixed(2)}`
}

export function formatCostSummary(): string {
  const totalUSD = getTotalCostUSD()
  const durationSecs = Math.round(getSessionDurationMs() / 1000)
  const lines: string[] = []

  lines.push(`会话成本摘要`)
  lines.push(`─────────────────────`)

  for (const [model, usage] of usageByModel) {
    const shortModel = model.replace(/^claude-/, '').replace(/-\d{8}$/, '')
    lines.push(`${shortModel}`)
    lines.push(`  输入: ${usage.inputTokens.toLocaleString()} tokens`)
    lines.push(`  输出: ${usage.outputTokens.toLocaleString()} tokens`)
    if (usage.cacheReadTokens > 0) {
      lines.push(`  缓存读: ${usage.cacheReadTokens.toLocaleString()} tokens`)
    }
    lines.push(`  成本: ${formatCostUSD(usage.costUSD)}`)
  }

  lines.push(`─────────────────────`)
  lines.push(`总计: ${formatCostUSD(totalUSD)}`)
  lines.push(`会话时长: ${Math.floor(durationSecs / 60)}m ${durationSecs % 60}s`)

  if (totalLinesAdded > 0 || totalLinesRemoved > 0) {
    lines.push(`代码变更: +${totalLinesAdded} -${totalLinesRemoved} 行`)
  }

  return lines.join('\n')
}
