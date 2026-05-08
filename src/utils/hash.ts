/**
 * Hash utilities — ported from CC's utils/hash.ts (verbatim)
 *
 * - djb2Hash(): deterministic non-crypto hash (disk-stable, runtime-independent)
 * - hashContent(): fast content hashing (Bun.hash or SHA-256)
 * - hashPair(): hash two strings without allocation (seed-chaining)
 */

import { createHash } from 'crypto'

/** djb2 non-crypto hash — deterministic across runtimes. */
export function djb2Hash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return hash
}

/** Fast content hash for change detection (not crypto-safe). */
export function hashContent(content: string): string {
  if (typeof Bun !== 'undefined') return Bun.hash(content).toString()
  return createHash('sha256').update(content).digest('hex')
}

/** Hash two strings without temp allocation (seed-chaining). */
export function hashPair(a: string, b: string): string {
  if (typeof Bun !== 'undefined') return Bun.hash(b, Bun.hash(a)).toString()
  return createHash('sha256').update(a).update('\0').update(b).digest('hex')
}
