/**
 * File state cache — direct port of CC's utils/fileStateCache.ts
 *
 * LRU cache tracking which files have been read and their content.
 * Used by FileReadTool to track file state across the conversation
 * and detect when files have changed since last read.
 */

import { LRUCache } from 'lru-cache'
import { normalize } from 'node:path'

export type FileState = {
  content: string
  timestamp: number
  offset: number | undefined
  limit: number | undefined
  /** True when the model has only seen a partial view (stripped comments, truncated MEMORY.md) */
  isPartialView?: boolean
}

export const READ_FILE_STATE_CACHE_SIZE = 100
const DEFAULT_MAX_CACHE_SIZE_BYTES = 25 * 1024 * 1024  // 25MB

/**
 * A file state cache with normalized path keys.
 * Ensures consistent cache hits regardless of relative/absolute paths
 * or Windows/POSIX path separator differences.
 */
export class FileStateCache {
  private cache: LRUCache<string, FileState>

  constructor(maxEntries: number, maxSizeBytes: number) {
    this.cache = new LRUCache<string, FileState>({
      max: maxEntries,
      maxSize: maxSizeBytes,
      sizeCalculation: value => Math.max(1, Buffer.byteLength(value.content)),
    })
  }

  get(key: string): FileState | undefined { return this.cache.get(normalize(key)) }
  set(key: string, value: FileState): this { this.cache.set(normalize(key), value); return this }
  has(key: string): boolean { return this.cache.has(normalize(key)) }
  delete(key: string): boolean { return this.cache.delete(normalize(key)) }
  clear(): void { this.cache.clear() }

  get size(): number { return this.cache.size }
  get max(): number { return this.cache.max }
  get maxSize(): number { return this.cache.maxSize }
  get calculatedSize(): number { return this.cache.calculatedSize ?? 0 }

  keys(): Generator<string> { return this.cache.keys() }
  entries(): Generator<[string, FileState]> { return this.cache.entries() }

  dump(): ReturnType<LRUCache<string, FileState>['dump']> { return this.cache.dump() }
  load(entries: ReturnType<LRUCache<string, FileState>['dump']>): void { this.cache.load(entries) }
}

export function createFileStateCacheWithSizeLimit(
  maxEntries: number,
  maxSizeBytes: number = DEFAULT_MAX_CACHE_SIZE_BYTES,
): FileStateCache {
  return new FileStateCache(maxEntries, maxSizeBytes)
}

export function cacheToObject(cache: FileStateCache): Record<string, FileState> {
  return Object.fromEntries(cache.entries())
}

export function cacheKeys(cache: FileStateCache): string[] {
  return Array.from(cache.keys())
}

export function cloneFileStateCache(cache: FileStateCache): FileStateCache {
  const cloned = createFileStateCacheWithSizeLimit(cache.max, cache.maxSize)
  cloned.load(cache.dump())
  return cloned
}

export function mergeFileStateCaches(first: FileStateCache, second: FileStateCache): FileStateCache {
  const merged = cloneFileStateCache(first)
  for (const [filePath, fileState] of second.entries()) {
    const existing = merged.get(filePath)
    if (!existing || fileState.timestamp > existing.timestamp) {
      merged.set(filePath, fileState)
    }
  }
  return merged
}
