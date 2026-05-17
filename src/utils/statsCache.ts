/**
 * Stats disk cache — adapted from CC's utils/statsCache.ts
 *
 * Caches computed statistics on disk to avoid reprocessing all JSONL
 * files on every /stats call. Only recomputes stats for new sessions
 * since the last cache update.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const CACHE_VERSION = 1
const CACHE_FILENAME = 'stats-cache.json'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DailyActivity = {
  date: string         // YYYY-MM-DD
  sessions: number
  messages: number
  inputTokens: number
  outputTokens: number
}

export type ModelUsage = {
  model: string
  sessions: number
  inputTokens: number
  outputTokens: number
  cost: number
}

export type PersistedStatsCache = {
  version: number
  lastComputedDate: string | null
  dailyActivity: DailyActivity[]
  modelUsage: Record<string, ModelUsage>
  totalSessions: number
  totalMessages: number
  firstSessionDate: string | null
  hourCounts: Record<string, number>  // hour → count
}

// ─── Lock ─────────────────────────────────────────────────────────────────────

let _lockPromise: Promise<void> | null = null

export async function withStatsCacheLock<T>(fn: () => Promise<T>): Promise<T> {
  while (_lockPromise) { await _lockPromise }

  let release: (() => void) | undefined
  _lockPromise = new Promise<void>(r => { release = r })
  try { return await fn() }
  finally { _lockPromise = null; release?.() }
}

// ─── Path ─────────────────────────────────────────────────────────────────────

function getCachePath(): string {
  const dir = join(homedir(), '.qiling')
  mkdirSync(dir, { recursive: true })
  return join(dir, CACHE_FILENAME)
}

export function getStatsCachePath(): string { return getCachePath() }

// ─── Load / save ──────────────────────────────────────────────────────────────

export function loadStatsCache(): PersistedStatsCache | null {
  const path = getCachePath()
  if (!existsSync(path)) return null
  try {
    const raw = JSON.parse(readFileSync(path, 'utf-8')) as PersistedStatsCache
    if (raw.version !== CACHE_VERSION) return null
    return raw
  } catch {
    return null
  }
}

export function saveStatsCache(cache: PersistedStatsCache): void {
  try {
    writeFileSync(getCachePath(), JSON.stringify(cache, null, 2), 'utf-8')
  } catch { /* best-effort */ }
}

// ─── Merge helpers ─────────────────────────────────────────────────────────────

export function mergeCacheWithNewStats(
  existing: PersistedStatsCache | null,
  newActivity: DailyActivity[],
  newModelUsage: Record<string, ModelUsage>,
  newTotalSessions: number,
  newTotalMessages: number,
  firstSessionDate: string | null,
): PersistedStatsCache {
  const dailyMap = new Map<string, DailyActivity>()

  // Start with existing
  for (const d of (existing?.dailyActivity ?? [])) {
    dailyMap.set(d.date, { ...d })
  }

  // Merge new activity
  for (const d of newActivity) {
    const ex = dailyMap.get(d.date)
    if (ex) {
      ex.sessions += d.sessions
      ex.messages += d.messages
      ex.inputTokens += d.inputTokens
      ex.outputTokens += d.outputTokens
    } else {
      dailyMap.set(d.date, { ...d })
    }
  }

  // Merge model usage
  const modelUsage = { ...(existing?.modelUsage ?? {}) }
  for (const [model, usage] of Object.entries(newModelUsage)) {
    const ex = modelUsage[model]
    if (ex) {
      ex.sessions += usage.sessions
      ex.inputTokens += usage.inputTokens
      ex.outputTokens += usage.outputTokens
    } else {
      modelUsage[model] = { ...usage }
    }
  }

  return {
    version: CACHE_VERSION,
    lastComputedDate: toDateString(new Date()),
    dailyActivity: [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    modelUsage,
    totalSessions: (existing?.totalSessions ?? 0) + newTotalSessions,
    totalMessages: (existing?.totalMessages ?? 0) + newTotalMessages,
    firstSessionDate: existing?.firstSessionDate ?? firstSessionDate,
    hourCounts: existing?.hourCounts ?? {},
  }
}

// ─── Date utilities ───────────────────────────────────────────────────────────

export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function getTodayDateString(): string {
  return toDateString(new Date())
}

export function getYesterdayDateString(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return toDateString(d)
}

export function isDateBefore(dateA: string, dateB: string): boolean {
  return dateA < dateB
}
