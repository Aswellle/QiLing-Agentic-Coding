/**
 * Session statistics service.
 * Aggregates data from session history files (.jsonl format).
 */

import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { getGlobalConfigDir } from '../settings/loader'

export interface DailyActivity {
  date: string        // YYYY-MM-DD
  sessions: number
  messages: number
  inputTokens: number
  outputTokens: number
}

export interface ModelUsage {
  model: string
  sessions: number
  inputTokens: number
  outputTokens: number
  cost: number
}

export interface QiLingStats {
  totalSessions: number
  totalMessages: number
  totalDays: number
  activeDays: number
  currentStreak: number      // consecutive days with activity
  longestStreak: number
  dailyActivity: DailyActivity[]
  modelUsage: ModelUsage[]
  firstSessionDate: string | null
  lastSessionDate: string | null
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
  longestSessionMessages: number
  avgMessagesPerSession: number
}

// Find the history directory
function getHistoryDir(): string {
  // Check env override
  if (process.env.QILING_HISTORY_DIR) return process.env.QILING_HISTORY_DIR
  return join(getGlobalConfigDir(), 'history')
}

// Parse a JSONL session file and extract stats
function parseSessionFile(filePath: string): {
  date: string
  messageCount: number
  inputTokens: number
  outputTokens: number
  models: string[]
} | null {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean)

    let firstTimestamp: string | number | null = null
    let messageCount = 0
    let inputTokens = 0
    let outputTokens = 0
    const modelsSet = new Set<string>()

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as {
          timestamp?: string | number
          type?: string
          role?: string
          usage?: { input_tokens?: number; output_tokens?: number }
          model?: string
        }

        if (entry.timestamp && firstTimestamp === null) firstTimestamp = entry.timestamp
        if (entry.role === 'user' || entry.role === 'assistant') messageCount++
        if (entry.usage) {
          inputTokens += entry.usage.input_tokens ?? 0
          outputTokens += entry.usage.output_tokens ?? 0
        }
        if (entry.model) modelsSet.add(entry.model)
      } catch { /* skip bad lines */ }
    }

    if (firstTimestamp === null) return null

    // Handle both Unix timestamp (number) and ISO string formats
    let date: string
    if (typeof firstTimestamp === 'number') {
      date = new Date(firstTimestamp).toISOString().slice(0, 10)
    } else {
      date = String(firstTimestamp).slice(0, 10)
    }

    return { date, messageCount, inputTokens, outputTokens, models: [...modelsSet] }
  } catch {
    return null
  }
}

// Calculate streaks from sorted date strings
function calculateStreaks(activeDatesSorted: string[]): { current: number; longest: number } {
  if (activeDatesSorted.length === 0) return { current: 0, longest: 0 }

  let longest = 1
  let current = 1
  const today = new Date().toISOString().slice(0, 10)

  for (let i = 1; i < activeDatesSorted.length; i++) {
    const prev = new Date(activeDatesSorted[i - 1]!)
    const curr = new Date(activeDatesSorted[i]!)
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      current++
      if (current > longest) longest = current
    } else {
      current = 1
    }
  }

  // Check if streak is still ongoing (last active date is today or yesterday)
  const lastDate = activeDatesSorted[activeDatesSorted.length - 1]!
  const daysSinceLast = Math.round((new Date(today).getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))
  if (daysSinceLast > 1) current = 0

  return { current, longest }
}

let _statsCache: QiLingStats | null = null
let _statsCacheTime = 0
const CACHE_TTL_MS = 5 * 60 * 1000  // 5 minutes

export function clearStatsCache(): void {
  _statsCache = null
}

export async function loadStats(forceRefresh = false): Promise<QiLingStats> {
  if (!forceRefresh && _statsCache && (Date.now() - _statsCacheTime) < CACHE_TTL_MS) {
    return _statsCache
  }

  const historyDir = getHistoryDir()

  // Also check CC-compatible path
  const ccHistoryDir = join(homedir(), '.claude', 'history')

  const sessionData: ReturnType<typeof parseSessionFile>[] = []

  for (const dir of [historyDir, ccHistoryDir]) {
    if (!existsSync(dir)) continue
    try {
      const files = readdirSync(dir, { recursive: true }) as string[]
      const jsonlFiles = files.filter(f => typeof f === 'string' && f.endsWith('.jsonl'))
      for (const file of jsonlFiles) {
        const data = parseSessionFile(join(dir, file))
        if (data) sessionData.push(data)
      }
    } catch { /* skip */ }
  }

  // Aggregate
  const dailyMap = new Map<string, DailyActivity>()
  const modelMap = new Map<string, ModelUsage>()
  let totalMessages = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let longestSession = 0

  for (const session of sessionData) {
    if (!session) continue

    const day = dailyMap.get(session.date) ?? { date: session.date, sessions: 0, messages: 0, inputTokens: 0, outputTokens: 0 }
    day.sessions++
    day.messages += session.messageCount
    day.inputTokens += session.inputTokens
    day.outputTokens += session.outputTokens
    dailyMap.set(session.date, day)

    totalMessages += session.messageCount
    totalInputTokens += session.inputTokens
    totalOutputTokens += session.outputTokens
    if (session.messageCount > longestSession) longestSession = session.messageCount

    for (const model of session.models) {
      const mu = modelMap.get(model) ?? { model, sessions: 0, inputTokens: 0, outputTokens: 0, cost: 0 }
      mu.sessions++
      mu.inputTokens += session.inputTokens
      mu.outputTokens += session.outputTokens
      modelMap.set(model, mu)
    }
  }

  const dailyActivity = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date))
  const activeDates = dailyActivity.map(d => d.date)
  const streaks = calculateStreaks(activeDates)
  const validSessions = sessionData.filter(Boolean).length

  const stats: QiLingStats = {
    totalSessions: validSessions,
    totalMessages,
    totalDays: new Set(activeDates).size,
    activeDays: activeDates.length,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    dailyActivity,
    modelUsage: [...modelMap.values()].sort((a, b) => b.sessions - a.sessions),
    firstSessionDate: activeDates[0] ?? null,
    lastSessionDate: activeDates[activeDates.length - 1] ?? null,
    totalInputTokens,
    totalOutputTokens,
    totalCost: 0,  // Computed separately with cost tracker
    longestSessionMessages: longestSession,
    avgMessagesPerSession: validSessions > 0
      ? Math.round(totalMessages / validSessions)
      : 0,
  }

  _statsCache = stats
  _statsCacheTime = Date.now()
  return stats
}
