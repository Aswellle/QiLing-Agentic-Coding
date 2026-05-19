/**
 * Line width cache — adapted from CC's ink/line-width-cache.ts
 *
 * During streaming, text grows but completed lines are immutable.
 * Caching stringWidth per-line avoids re-measuring hundreds of
 * unchanged lines on every token (~50x reduction in stringWidth calls).
 */

import stringWidth from 'string-width'

const cache = new Map<string, number>()
const MAX_CACHE_SIZE = 4096

export function lineWidth(line: string): number {
  const cached = cache.get(line)
  if (cached !== undefined) return cached

  const width = stringWidth(line)

  // Simple full-clear when cache is full — repopulates in one frame
  if (cache.size >= MAX_CACHE_SIZE) {
    cache.clear()
  }

  cache.set(line, width)
  return width
}
