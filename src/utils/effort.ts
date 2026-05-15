/**
 * Effort level system — controls model reasoning depth.
 * Maps to extended thinking token budgets for Claude models.
 *
 * Levels: low (no extended thinking) | medium | high | max (most thorough)
 * Not all models support effort levels. Only Claude Sonnet 4.6+ and Opus 4.7+.
 */

export type EffortLevel = 'low' | 'medium' | 'high' | 'max'

// Models that support effort/extended thinking
const EFFORT_SUPPORTED_MODELS = new Set([
  'claude-opus-4-7',
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-sonnet-4-5',
  'claude-haiku-4-5',
  'claude-haiku-4-5-20251001',
])

// Token budgets for each effort level
const EFFORT_THINKING_BUDGETS: Record<EffortLevel, number> = {
  low: 0,          // No extended thinking
  medium: 4_000,   // ~4k thinking tokens
  high: 10_000,    // ~10k thinking tokens
  max: 32_000,     // Maximum thinking (ultrathink equivalent)
}

export function modelSupportsEffort(model: string): boolean {
  // Check exact match or prefix match
  return EFFORT_SUPPORTED_MODELS.has(model) ||
    model.startsWith('claude-opus-4') ||
    model.startsWith('claude-sonnet-4') ||
    model.startsWith('claude-haiku-4-5')
}

export function getEffortThinkingBudget(level: EffortLevel): number {
  return EFFORT_THINKING_BUDGETS[level]
}

export function parseEffortLevel(raw: unknown): EffortLevel | undefined {
  if (raw === 'low' || raw === 'medium' || raw === 'high' || raw === 'max') return raw
  // Numeric aliases: 1=low, 2=medium, 3=high, 4=max
  if (raw === 1 || raw === '1') return 'low'
  if (raw === 2 || raw === '2') return 'medium'
  if (raw === 3 || raw === '3') return 'high'
  if (raw === 4 || raw === '4') return 'max'
  return undefined
}

/**
 * Resolve the effective effort level following CC's precedence chain:
 * 1. Environment variable QILING_EFFORT
 * 2. Settings effortLevel
 * 3. Model default (Opus: medium, others: low)
 */
export function resolveEffortLevel(
  settings?: { effortLevel?: EffortLevel },
  model?: string,
): EffortLevel {
  // Env var override
  const envEffort = parseEffortLevel(process.env.QILING_EFFORT)
  if (envEffort) return envEffort

  // Settings override
  if (settings?.effortLevel) return settings.effortLevel

  // Model default: Opus gets medium by default, others get low
  if (model?.includes('opus')) return 'medium'
  return 'low'
}

export function getEffortDisplayName(level: EffortLevel): string {
  const names: Record<EffortLevel, string> = {
    low: '标准',
    medium: '深度',
    high: '强力',
    max: '极限',
  }
  return names[level]
}

export function getEffortSuffix(level: EffortLevel): string {
  if (level === 'low') return ''
  return ` · ${getEffortDisplayName(level)}思考`
}
