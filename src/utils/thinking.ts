/**
 * Thinking/extended reasoning utilities — ported from CC's utils/thinking.ts
 *
 * Manages the ThinkingConfig type and ultrathink keyword detection.
 * Ultrathink triggers maximum extended reasoning budget.
 */

export type ThinkingConfig =
  | { type: 'adaptive' }
  | { type: 'enabled'; budgetTokens: number }
  | { type: 'disabled' }

// ─── Keyword detection ────────────────────────────────────────────────────────

/**
 * Check if text contains the "ultrathink" trigger keyword.
 * Used to automatically enable maximum extended reasoning.
 */
export function hasUltrathinkKeyword(text: string): boolean {
  return /\bultrathink\b/i.test(text)
}

/**
 * Find all positions of "ultrathink" keyword in text.
 * Used for UI highlighting in the PromptInput.
 */
export function findThinkingTriggerPositions(text: string): Array<{
  word: string
  start: number
  end: number
}> {
  const positions: Array<{ word: string; start: number; end: number }> = []
  const matches = text.matchAll(/\bultrathink\b/gi)
  for (const match of matches) {
    if (match.index !== undefined) {
      positions.push({
        word: match[0],
        start: match.index,
        end: match.index + match[0].length,
      })
    }
  }
  return positions
}

// ─── Model capability detection ───────────────────────────────────────────────

const THINKING_SUPPORTED_PREFIXES = [
  'claude-opus-4',
  'claude-sonnet-4',
  'claude-haiku-4-5',
]

/**
 * Check if a model supports extended thinking (thinking budget).
 * Returns true for Claude 4+ models.
 */
export function modelSupportsThinking(model: string): boolean {
  const lower = model.toLowerCase()
  return THINKING_SUPPORTED_PREFIXES.some(prefix => lower.startsWith(prefix))
}

// ─── ThinkingConfig helpers ───────────────────────────────────────────────────

/** Maximum thinking tokens (ultrathink level) */
export const MAX_THINKING_TOKENS = 32_000

/** Thinking tokens for "max" effort level */
export const MAX_EFFORT_THINKING_TOKENS = 32_000

/** Thinking tokens for "high" effort level */
export const HIGH_EFFORT_THINKING_TOKENS = 10_000

/** Thinking tokens for "medium" effort level */
export const MEDIUM_EFFORT_THINKING_TOKENS = 4_000

/**
 * Build a ThinkingConfig from a budget in tokens.
 * Returns disabled if budget is 0 or model doesn't support thinking.
 */
export function buildThinkingConfig(
  budgetTokens: number,
  model: string,
): ThinkingConfig {
  if (budgetTokens <= 0 || !modelSupportsThinking(model)) {
    return { type: 'disabled' }
  }
  return { type: 'enabled', budgetTokens }
}

/**
 * Check if the user's prompt contains ultrathink and return the appropriate
 * ThinkingConfig. Returns null if no ultrathink keyword found.
 */
export function getUltrathinkConfig(prompt: string, model: string): ThinkingConfig | null {
  if (!hasUltrathinkKeyword(prompt)) return null
  if (!modelSupportsThinking(model)) return null
  return { type: 'enabled', budgetTokens: MAX_THINKING_TOKENS }
}

// ─── Rainbow colors (for ultrathink highlighting in UI) ───────────────────────

export const RAINBOW_COLORS = [
  'rgb(235,95,87)',   // red
  'rgb(245,139,87)',  // orange
  'rgb(250,195,95)',  // yellow
  'rgb(145,200,130)', // green
  'rgb(130,170,220)', // blue
  'rgb(155,130,200)', // indigo
  'rgb(200,130,180)', // violet
] as const

export function getRainbowColor(charIndex: number): string {
  return RAINBOW_COLORS[charIndex % RAINBOW_COLORS.length] ?? RAINBOW_COLORS[0]
}
