/**
 * Pure display formatters — ported from CC's utils/format.ts
 *
 * CC deps replaced: getRelativeTimeFormat/getTimeZone → imported from local intl.ts
 */

import { getRelativeTimeFormat, getTimeZone } from './intl'

/** Formats a byte count to human-readable string (KB, MB, GB). */
export function formatFileSize(sizeInBytes: number): string {
  const kb = sizeInBytes / 1024
  if (kb < 1) return `${sizeInBytes} bytes`
  if (kb < 1024) return `${kb.toFixed(1).replace(/\.0$/, '')}KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1).replace(/\.0$/, '')}MB`
  const gb = mb / 1024
  return `${gb.toFixed(1).replace(/\.0$/, '')}GB`
}

/** Formats milliseconds as seconds with 1 decimal (e.g. 1234 → "1.2s"). */
export function formatSecondsShort(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`
}

export function formatDuration(
  ms: number,
  options?: { hideTrailingZeros?: boolean; mostSignificantOnly?: boolean },
): string {
  if (ms < 60000) {
    if (ms === 0) return '0s'
    if (ms < 1) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 1000)}s`
  }
  let days = Math.floor(ms / 86_400_000)
  let hours = Math.floor((ms % 86_400_000) / 3_600_000)
  let minutes = Math.floor((ms % 3_600_000) / 60_000)
  let seconds = Math.round((ms % 60_000) / 1_000)
  if (seconds === 60) { seconds = 0; minutes++ }
  if (minutes === 60) { minutes = 0; hours++ }
  if (hours === 24) { hours = 0; days++ }
  const hide = options?.hideTrailingZeros
  if (options?.mostSignificantOnly) {
    if (days > 0) return `${days}d`
    if (hours > 0) return `${hours}h`
    if (minutes > 0) return `${minutes}m`
    return `${seconds}s`
  }
  if (days > 0) {
    if (hide && hours === 0 && minutes === 0) return `${days}d`
    if (hide && minutes === 0) return `${days}d ${hours}h`
    return `${days}d ${hours}h ${minutes}m`
  }
  if (hours > 0) {
    if (hide && minutes === 0 && seconds === 0) return `${hours}h`
    if (hide && seconds === 0) return `${hours}h ${minutes}m`
    return `${hours}h ${minutes}m ${seconds}s`
  }
  if (minutes > 0) {
    if (hide && seconds === 0) return `${minutes}m`
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

let _compactFormatter: Intl.NumberFormat | null = null
let _plainFormatter: Intl.NumberFormat | null = null

export function formatNumber(number: number): string {
  const useCompact = number >= 1000
  if (useCompact) {
    if (!_compactFormatter) {
      _compactFormatter = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1, minimumFractionDigits: 1 })
    }
    return _compactFormatter.format(number).toLowerCase()
  }
  if (!_plainFormatter) {
    _plainFormatter = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1, minimumFractionDigits: 0 })
  }
  return _plainFormatter.format(number).toLowerCase()
}

export function formatTokens(count: number): string {
  return formatNumber(count).replace('.0', '')
}

export function formatRelativeTime(date: Date, options: { style?: 'long' | 'short' | 'narrow'; numeric?: 'always' | 'auto'; now?: Date } = {}): string {
  const { style = 'narrow', numeric = 'always', now = new Date() } = options
  const diffMs = date.getTime() - now.getTime()
  const diffSec = Math.round(diffMs / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffHour = Math.round(diffMin / 60)
  const diffDay = Math.round(diffHour / 24)
  const diffWeek = Math.round(diffDay / 7)
  const diffMonth = Math.round(diffDay / 30)
  const diffYear = Math.round(diffDay / 365)
  const rtf = getRelativeTimeFormat(style, numeric)
  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second')
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute')
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour')
  if (Math.abs(diffDay) < 7) return rtf.format(diffDay, 'day')
  if (Math.abs(diffWeek) < 5) return rtf.format(diffWeek, 'week')
  if (Math.abs(diffMonth) < 12) return rtf.format(diffMonth, 'month')
  return rtf.format(diffYear, 'year')
}

/**
 * Format a date within the user's local timezone, using locale-aware formatting.
 * @example formatLocalDate(new Date()) → "May 3, 2026"
 */
export function formatLocalDate(date: Date, timeZone?: string): string {
  return date.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    timeZone: timeZone ?? getTimeZone(),
  })
}

/**
 * Format a date as "X minutes/hours ago" — ported from CC's utils/format.ts.
 */
export function formatRelativeTimeAgo(
  date: Date,
  options: { style?: 'long' | 'short' | 'narrow'; numeric?: 'always' | 'auto'; now?: Date } = {},
): string {
  const { now = new Date(), ...restOptions } = options
  if (date > now) return formatRelativeTime(date, { ...restOptions, now })
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.round(diffMs / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffHour = Math.round(diffMin / 60)
  const diffDay = Math.round(diffHour / 24)
  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`
}

/**
 * Format a Unix timestamp (seconds) as a localized time/date string.
 * Returns undefined if no timestamp. Ported from CC's utils/format.ts.
 */
export function formatResetTime(
  timestampInSeconds: number | undefined,
  showTimezone = false,
  showTime = true,
): string | undefined {
  if (!timestampInSeconds) return undefined
  const date = new Date(timestampInSeconds * 1000)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  const timeStr = showTime
    ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', ...(showTimezone ? { timeZoneName: 'short' } : {}) })
    : ''
  if (sameDay) return showTime ? timeStr : 'today'
  const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return showTime ? `${dateStr} at ${timeStr}` : dateStr
}

/**
 * Format an ISO reset timestamp string. Ported from CC's utils/format.ts.
 */
export function formatResetText(
  resetsAt: string,
  showTimezone = false,
  showTime = true,
): string {
  const dt = new Date(resetsAt)
  return formatResetTime(Math.floor(dt.getTime() / 1000), showTimezone, showTime) ?? resetsAt
}

/**
 * Format session log metadata for /history command display.
 * Ported from CC's utils/format.ts formatLogMetadata().
 */
export function formatLogMetadata(log: {
  modified: Date
  messageCount: number
  fileSize?: number
  gitBranch?: string
  tag?: string
  agentSetting?: string
  prNumber?: number
  prRepository?: string
}): string {
  const sizeOrCount = log.fileSize !== undefined
    ? formatFileSize(log.fileSize)
    : `${log.messageCount} messages`

  const parts = [
    formatRelativeTimeAgo(log.modified, { style: 'short' }),
    ...(log.gitBranch ? [log.gitBranch] : []),
    sizeOrCount,
  ]

  if (log.tag) parts.push(`#${log.tag}`)
  if (log.agentSetting) parts.push(`@${log.agentSetting}`)
  if (log.prNumber) {
    const repo = log.prRepository ? `${log.prRepository}#${log.prNumber}` : `#${log.prNumber}`
    parts.push(repo)
  }

  return parts.filter(Boolean).join(' · ')
}

// FROM CC: back-compat re-exports (truncate helpers live in ./truncate.ts)
export {
  truncate,
  truncatePathMiddle,
  truncateStartToWidth,
  truncateToWidth,
  truncateToWidthNoEllipsis,
  wrapText,
} from './truncate.js'
