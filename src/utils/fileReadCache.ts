/**
 * File read cache with mtime invalidation — adapted from CC's utils/fileReadCache.ts
 *
 * Eliminates redundant file reads in FileEditTool operations.
 * Cache key = file path; invalidated when mtime changes.
 */

import { statSync, readFileSync } from 'node:fs'
import { detectEncodingForResolvedPath } from './fileRead.js'

type CachedFileData = {
  content: string
  encoding: BufferEncoding
  mtime: number
}

class FileReadCache {
  private cache = new Map<string, CachedFileData>()
  private readonly maxCacheSize = 1000

  readFile(filePath: string): { content: string; encoding: BufferEncoding } {
    let stats
    try {
      stats = statSync(filePath)
    } catch (error) {
      this.cache.delete(filePath)
      throw error
    }

    const cached = this.cache.get(filePath)
    if (cached && cached.mtime === stats.mtimeMs) {
      return { content: cached.content, encoding: cached.encoding }
    }

    const encoding = detectEncodingForResolvedPath(filePath)
    const content = readFileSync(filePath, { encoding }).replaceAll('\r\n', '\n')

    this.cache.set(filePath, { content, encoding, mtime: stats.mtimeMs })

    if (this.cache.size > this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) this.cache.delete(firstKey)
    }

    return { content, encoding }
  }

  clear(): void {
    this.cache.clear()
  }

  invalidate(filePath: string): void {
    this.cache.delete(filePath)
  }

  getStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    }
  }
}

export const fileReadCache = new FileReadCache()
