/**
 * Memory age utilities — freshness tracking for memory files.
 * Warns when memories are stale (>7 days) or very old (>30 days).
 */

export function memoryAgeDays(mtimeMs: number): number {
  return Math.floor((Date.now() - mtimeMs) / (1000 * 60 * 60 * 24))
}

export function memoryAge(mtimeMs: number): string {
  const days = memoryAgeDays(mtimeMs)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

export function memoryFreshnessText(mtimeMs: number): string {
  const days = memoryAgeDays(mtimeMs)
  if (days < 7) return ''
  if (days < 30) return `Note: this memory is ${memoryAge(mtimeMs)} — verify it is still accurate.`
  return `⚠ This memory is ${days} days old — it may be significantly out of date.`
}

export function memoryFreshnessNote(mtimeMs: number): string {
  const text = memoryFreshnessText(mtimeMs)
  if (!text) return ''
  return `<system-reminder>\n${text}\n</system-reminder>`
}
