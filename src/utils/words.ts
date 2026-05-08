/**
 * Random word slug generator — inspired by CC's utils/words.ts
 * Generates readable IDs like "graceful-phoenix" or "bright-brewing-storm"
 */

import { randomBytes } from 'crypto'

const ADJECTIVES = [
  'bright', 'calm', 'clever', 'dazzling', 'eager', 'elegant', 'golden',
  'graceful', 'happy', 'hidden', 'jolly', 'keen', 'lively', 'lovely',
  'mellow', 'nimble', 'peaceful', 'radiant', 'serene', 'swift',
  'tender', 'vivid', 'warm', 'wise', 'cosmic', 'silent', 'gentle',
]

const NOUNS = [
  'aurora', 'beacon', 'breeze', 'canyon', 'dawn', 'echo', 'flame',
  'forest', 'harbor', 'horizon', 'lantern', 'lighthouse', 'meadow',
  'moon', 'mountain', 'ocean', 'phoenix', 'river', 'star', 'summit',
  'sunrise', 'thunder', 'tide', 'valley', 'wave', 'willow', 'zenith',
]

const VERBS = [
  'blooming', 'brewing', 'dancing', 'drifting', 'flowing', 'gleaming',
  'glowing', 'humming', 'rising', 'sailing', 'shining', 'soaring',
  'spinning', 'streaming', 'swirling', 'wandering', 'weaving', 'winding',
]

function randomInt(max: number): number {
  return Number(randomBytes(4).readUInt32BE(0)) % max
}

function pick<T>(arr: T[]): T { return arr[randomInt(arr.length)]! }

/** Generate "adjective-verb-noun" slug (e.g., "bright-gleaming-aurora") */
export function generateWordSlug(): string {
  return `${pick(ADJECTIVES)}-${pick(VERBS)}-${pick(NOUNS)}`
}

/** Generate "adjective-noun" slug (e.g., "graceful-phoenix") */
export function generateShortWordSlug(): string {
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}`
}
