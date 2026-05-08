/**
 * Tool error formatting utilities — ported from CC's utils/toolErrors.ts
 *
 * formatError(): format any error value for display to user/AI
 * Truncates very long errors at ±5000 chars with middle ellipsis.
 */

const MAX_ERROR_LENGTH = 10_000
const HALF_LENGTH = 5_000

export function formatError(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  const msg = error.message?.trim() || 'Command failed with no output'
  if (msg.length <= MAX_ERROR_LENGTH) return msg
  return `${msg.slice(0, HALF_LENGTH)}\n\n... [${msg.length - MAX_ERROR_LENGTH} characters truncated] ...\n\n${msg.slice(-HALF_LENGTH)}`
}
