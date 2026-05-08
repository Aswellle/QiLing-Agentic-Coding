/**
 * Common constants — ported from CC's constants/common.ts (adapted)
 *
 * getLocalISODate(): get local date (QILING_OVERRIDE_DATE env for testing)
 * getSessionStartDate(): memoized session-start date for cache stability
 */

let _sessionStartDate: string | null = null

/** Get local date in YYYY-MM-DD format. Respects QILING_OVERRIDE_DATE env. */
export function getLocalISODate(): string {
  if (process.env.QILING_OVERRIDE_DATE) return process.env.QILING_OVERRIDE_DATE
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Session-start date — memoized for prompt-cache stability. */
export function getSessionStartDate(): string {
  return (_sessionStartDate ??= getLocalISODate())
}

/** "Month YYYY" for tool prompts (changes monthly → less cache busting). */
export function getLocalMonthYear(): string {
  const date = process.env.QILING_OVERRIDE_DATE
    ? new Date(process.env.QILING_OVERRIDE_DATE)
    : new Date()
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

export const NO_CONTENT_MESSAGE = '(no content)'
