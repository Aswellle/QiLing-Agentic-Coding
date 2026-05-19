/**
 * Find the widest line in a multi-line string — adapted from CC's ink/widest-line.ts
 * Uses lineWidth() cache for performance during streaming.
 */

import { lineWidth } from './line-width-cache.js'

export function widestLine(string: string): number {
  let maxWidth = 0
  let start = 0
  while (start <= string.length) {
    const end = string.indexOf('\n', start)
    const line = end === -1 ? string.substring(start) : string.substring(start, end)
    maxWidth = Math.max(maxWidth, lineWidth(line))
    if (end === -1) break
    start = end + 1
  }
  return maxWidth
}
