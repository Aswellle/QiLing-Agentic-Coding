/**
 * Shell output length limits — adapted from CC's utils/shell/outputLimits.ts
 *
 * Controls how much output BashTool/PowerShellTool capture before truncating.
 * BASH_MAX_OUTPUT_LENGTH env var allows per-session override within bounds.
 */

export const BASH_MAX_OUTPUT_UPPER_LIMIT = 150_000
export const BASH_MAX_OUTPUT_DEFAULT = 30_000

/**
 * Get the max output length for shell tools.
 * Reads BASH_MAX_OUTPUT_LENGTH env var, clamped to [1, BASH_MAX_OUTPUT_UPPER_LIMIT].
 */
export function getMaxOutputLength(): number {
  const envVal = process.env.BASH_MAX_OUTPUT_LENGTH
  if (!envVal) return BASH_MAX_OUTPUT_DEFAULT
  const parsed = parseInt(envVal, 10)
  if (isNaN(parsed) || parsed <= 0) return BASH_MAX_OUTPUT_DEFAULT
  return Math.min(parsed, BASH_MAX_OUTPUT_UPPER_LIMIT)
}
