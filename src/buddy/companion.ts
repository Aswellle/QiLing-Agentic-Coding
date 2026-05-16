/**
 * 宠物伙伴核心逻辑 — 移植自 CC's buddy/companion.ts
 *
 * 核心机制：
 *  - 宠物的"骨骼"（物种、眼睛、帽子、稀有度、属性值）由 hash(userId) 确定性生成，不存储
 *  - 宠物的"灵魂"（名字、性格）由 AI 生成，存储在 ~/.qiling/settings.json
 *  - 每次读取时骨骼重新从哈希生成，确保玩家无法通过编辑配置文件作弊
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import type {
  Companion, CompanionBones, Rarity, StatName,
  StoredCompanion,
} from './types'
import { EYES, HATS, RARITIES, RARITY_WEIGHTS, SPECIES, STAT_NAMES } from './types'

// ─── Mulberry32 PRNG（与 CC 完全一致） ──────────────────────────────────────
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(s: string): number {
  if (typeof Bun !== 'undefined') {
    return Number(BigInt(Bun.hash(s)) & 0xffffffffn)
  }
  // FNV-1a fallback
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!
}

function rollRarity(rng: () => number): Rarity {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0)
  let roll = rng() * total
  for (const rarity of RARITIES) {
    roll -= RARITY_WEIGHTS[rarity]
    if (roll < 0) return rarity
  }
  return 'common'
}

const RARITY_FLOOR: Record<Rarity, number> = {
  common: 5, uncommon: 15, rare: 25, epic: 35, legendary: 50,
}

function rollStats(rng: () => number, rarity: Rarity): Record<StatName, number> {
  const floor = RARITY_FLOOR[rarity]
  const peak = pick(rng, STAT_NAMES)
  let dump = pick(rng, STAT_NAMES)
  while (dump === peak) dump = pick(rng, STAT_NAMES)

  const stats = {} as Record<StatName, number>
  for (const name of STAT_NAMES) {
    if (name === peak) {
      stats[name] = Math.min(100, floor + 50 + Math.floor(rng() * 30))
    } else if (name === dump) {
      stats[name] = Math.max(1, floor - 10 + Math.floor(rng() * 15))
    } else {
      stats[name] = floor + Math.floor(rng() * 40)
    }
  }
  return stats
}

const SALT = 'qiling-buddy-2026'

export type Roll = { bones: CompanionBones; inspirationSeed: number }

function rollFrom(rng: () => number): Roll {
  const rarity = rollRarity(rng)
  const bones: CompanionBones = {
    rarity,
    species: pick(rng, SPECIES),
    eye: pick(rng, EYES),
    hat: rarity === 'common' ? 'none' : pick(rng, HATS),
    shiny: rng() < 0.01,
    stats: rollStats(rng, rarity),
  }
  return { bones, inspirationSeed: Math.floor(rng() * 1e9) }
}

let rollCache: { key: string; value: Roll } | undefined

export function roll(userId: string): Roll {
  const key = userId + SALT
  if (rollCache?.key === key) return rollCache.value
  const value = rollFrom(mulberry32(hashString(key)))
  rollCache = { key, value }
  return value
}

export function rollWithSeed(seed: string): Roll {
  return rollFrom(mulberry32(hashString(seed)))
}

// ─── 配置存储 ────────────────────────────────────────────────────────────────
function getConfigPath(): string {
  return join(homedir(), '.qiling', 'settings.json')
}

function readConfig(): Record<string, unknown> {
  const p = getConfigPath()
  if (!existsSync(p)) return {}
  try { return JSON.parse(readFileSync(p, 'utf-8')) as Record<string, unknown> } catch { return {} }
}

function writeConfig(data: Record<string, unknown>): void {
  const dir = join(homedir(), '.qiling')
  mkdirSync(dir, { recursive: true })
  writeFileSync(getConfigPath(), JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

// 获取稳定的用户 ID（hostname + 固定后缀，无网络请求）
export function companionUserId(): string {
  const cfg = readConfig()
  if (typeof cfg.companionUserId === 'string') return cfg.companionUserId
  // 生成并持久化一个稳定 ID
  const id = `qiling-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  writeConfig({ ...cfg, companionUserId: id })
  return id
}

export function getCompanion(): Companion | undefined {
  const cfg = readConfig()
  const stored = cfg.companion as StoredCompanion | undefined
  if (!stored) return undefined
  const { bones } = roll(companionUserId())
  return { ...stored, ...bones }
}

export function saveCompanion(soul: CompanionSoul): void {
  const cfg = readConfig()
  const stored: StoredCompanion = { ...soul, hatchedAt: Date.now() }
  writeConfig({ ...cfg, companion: stored })
  rollCache = undefined // 清除缓存，让下次读取重新生成
}

export function releaseCompanion(): void {
  const cfg = readConfig()
  const { companion: _, ...rest } = cfg
  writeConfig(rest)
  rollCache = undefined
}

export function isCompanionMuted(): boolean {
  const cfg = readConfig()
  return cfg.companionMuted === true
}

export function setCompanionMuted(muted: boolean): void {
  const cfg = readConfig()
  writeConfig({ ...cfg, companionMuted: muted })
}

export type CompanionSoul = { name: string; personality: string }

// ─── 孵化提示生成（供 /buddy hatch 使用）────────────────────────────────────
export function buildHatchPrompt(bones: CompanionBones): string {
  const { species, rarity, stats, shiny } = bones
  const statLines = STAT_NAMES
    .map(n => `  ${n}: ${stats[n]}`)
    .join('\n')
  const shinyNote = shiny ? ' (闪光型！极其罕见)' : ''

  return `你是 QiLing 宠物孵化系统。为这只刚孵化的伙伴创建名字和性格。

物种: ${species}${shinyNote}
稀有度: ${rarity}
属性值:
${statLines}

要求：
1. 名字：2-4个字的中文名，或2-6字的英文名，要符合物种特征和稀有度气质
2. 性格：1-2句话描述，体现物种特质和属性值高低带来的特点。性格要有趣、鲜明、符合宠物游戏风格。
3. 如果是植物系（sprout/fern/cactus/mushroom），性格应体现植物的特质（生长、光合、水分、季节等比喻）

请用以下 JSON 格式回答（只输出 JSON，不要其他内容）：
{"name": "名字", "personality": "性格描述"}`
}
