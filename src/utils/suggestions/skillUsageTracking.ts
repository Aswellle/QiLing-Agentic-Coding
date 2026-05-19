/**
 * Skill usage tracking — adapted from CC's utils/suggestions/skillUsageTracking.ts
 *
 * Tracks how often each skill (slash command) is used and when,
 * enabling frequency-based ranking with recency decay (7-day half-life).
 *
 * Storage: ~/.qiling/settings.json (skillUsage field)
 * Debouncing: 60s to avoid excessive file I/O on rapid skill invocations.
 */

import { join } from 'node:path'
import { homedir } from 'node:os'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const SKILL_USAGE_DEBOUNCE_MS = 60_000
const STORAGE_PATH = join(homedir(), '.qiling', 'skill-usage.json')

type SkillUsage = { usageCount: number; lastUsedAt: number }
type SkillUsageStore = Record<string, SkillUsage>

const lastWriteBySkill = new Map<string, number>()
let _cache: SkillUsageStore | null = null

function readStore(): SkillUsageStore {
  if (_cache) return _cache
  try {
    _cache = JSON.parse(readFileSync(STORAGE_PATH, 'utf-8')) as SkillUsageStore
  } catch {
    _cache = {}
  }
  return _cache
}

function writeStore(store: SkillUsageStore): void {
  try {
    mkdirSync(join(homedir(), '.qiling'), { recursive: true })
    writeFileSync(STORAGE_PATH, JSON.stringify(store, null, 2))
    _cache = store
  } catch { /* ignore write failures */ }
}

/**
 * Record a skill usage for ranking purposes.
 * Debounced at 60s to avoid excessive I/O.
 */
export function recordSkillUsage(skillName: string): void {
  const now = Date.now()
  const lastWrite = lastWriteBySkill.get(skillName)
  if (lastWrite !== undefined && now - lastWrite < SKILL_USAGE_DEBOUNCE_MS) return

  lastWriteBySkill.set(skillName, now)
  const store = readStore()
  const existing = store[skillName]
  store[skillName] = {
    usageCount: (existing?.usageCount ?? 0) + 1,
    lastUsedAt: now,
  }
  writeStore(store)
}

/**
 * Get usage score for a skill based on frequency + recency.
 * Higher = more frequently and recently used.
 * Exponential decay with 7-day half-life.
 */
export function getSkillUsageScore(skillName: string): number {
  const store = readStore()
  const usage = store[skillName]
  if (!usage) return 0

  const daysSinceUse = (Date.now() - usage.lastUsedAt) / (1000 * 60 * 60 * 24)
  const recencyFactor = Math.pow(0.5, daysSinceUse / 7)
  return usage.usageCount * Math.max(recencyFactor, 0.1)
}
