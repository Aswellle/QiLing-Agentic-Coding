/**
 * Token budget expression parser — ported from CC's utils/tokenBudget.ts
 *
 * Detects inline token budget expressions in user text:
 * - "+500k" at start or end of message
 * - "+1.5m" / "+2b"
 * - "use 100k tokens" / "spend 2M tokens"
 *
 * Used to extract a per-query token budget from the user's message.
 * Example: "use 500k tokens, analyze this codebase thoroughly"
 */

const SHORTHAND_START_RE = /^\s*\+(\d+(?:\.\d+)?)\s*(k|m|b)\b/i
const SHORTHAND_END_RE = /\s\+(\d+(?:\.\d+)?)\s*(k|m|b)\s*[.!?]?\s*$/i
const VERBOSE_RE = /\b(?:use|spend)\s+(\d+(?:\.\d+)?)\s*(k|m|b)\s*tokens?\b/i
const VERBOSE_RE_G = new RegExp(VERBOSE_RE.source, 'gi')

const MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  m: 1_000_000,
  b: 1_000_000_000,
}

function parseBudgetMatch(value: string, suffix: string): number {
  return parseFloat(value) * (MULTIPLIERS[suffix.toLowerCase()] ?? 1_000)
}

/**
 * Extract a token budget from user text.
 * Returns null if no budget expression found.
 */
export function parseTokenBudget(text: string): number | null {
  const startMatch = text.match(SHORTHAND_START_RE)
  if (startMatch) return parseBudgetMatch(startMatch[1]!, startMatch[2]!)
  const endMatch = text.match(SHORTHAND_END_RE)
  if (endMatch) return parseBudgetMatch(endMatch[1]!, endMatch[2]!)
  const verboseMatch = text.match(VERBOSE_RE)
  if (verboseMatch) return parseBudgetMatch(verboseMatch[1]!, verboseMatch[2]!)
  return null
}

/**
 * Returns true if the text contains a token budget expression.
 */
export function hasTokenBudget(text: string): boolean {
  return parseTokenBudget(text) !== null
}

/**
 * Remove token budget expressions from text (for clean prompt submission).
 * Removes "+500k", "use 1M tokens", etc. from the message.
 */
export function stripTokenBudget(text: string): string {
  return text
    .replace(SHORTHAND_START_RE, '')
    .replace(SHORTHAND_END_RE, '')
    .replace(VERBOSE_RE_G, '')
    .trim()
}

/**
 * Find all token budget expression positions in text — used for UI highlighting.
 * Returns [{start, end}] ranges of each budget expression.
 * Ported from CC's utils/tokenBudget.ts.
 */
export function findTokenBudgetPositions(
  text: string,
): Array<{ start: number; end: number }> {
  const positions: Array<{ start: number; end: number }> = []
  const startMatch = text.match(SHORTHAND_START_RE)
  if (startMatch) {
    const offset =
      startMatch.index! +
      startMatch[0].length -
      startMatch[0].trimStart().length
    positions.push({ start: offset, end: startMatch.index! + startMatch[0].length })
  }
  const endMatch = text.match(SHORTHAND_END_RE)
  if (endMatch) {
    const endStart = endMatch.index! + 1
    const alreadyCovered = positions.some(p => endStart >= p.start && endStart < p.end)
    if (!alreadyCovered) {
      positions.push({ start: endStart, end: endMatch.index! + endMatch[0].length })
    }
  }
  for (const match of text.matchAll(VERBOSE_RE_G)) {
    positions.push({ start: match.index, end: match.index + match[0].length })
  }
  return positions
}

/**
 * Generate the continuation nudge message when the token budget is hit.
 * Ported from CC's utils/tokenBudget.ts.
 */
export function getBudgetContinuationMessage(
  pct: number,
  turnTokens: number,
  budget: number,
): string {
  const fmt = (n: number): string => new Intl.NumberFormat('en-US').format(n)
  return `Stopped at ${pct}% of token target (${fmt(turnTokens)} / ${fmt(budget)}). Keep working — do not summarize.`
}
