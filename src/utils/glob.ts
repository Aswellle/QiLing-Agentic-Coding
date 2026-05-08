/**
 * Glob utility functions — ported from CC's utils/glob.ts (core subset)
 *
 * extractGlobBaseDirectory(): split a glob pattern into static base + relative pattern
 * Useful for optimizing glob searches by starting from the deepest static directory.
 */

import { basename, dirname, sep } from 'path'
import { getPlatform } from './platform'

/**
 * Extracts the static base directory from a glob pattern.
 * The base directory is everything before the first glob special character (* ? [ {).
 * Returns the directory portion and the remaining relative pattern.
 */
export function extractGlobBaseDirectory(pattern: string): {
  baseDir: string
  relativePattern: string
} {
  const globChars = /[*?[{]/
  const match = pattern.match(globChars)

  if (!match || match.index === undefined) {
    const dir = dirname(pattern)
    const file = basename(pattern)
    return { baseDir: dir, relativePattern: file }
  }

  const staticPrefix = pattern.slice(0, match.index)
  const lastSepIndex = Math.max(staticPrefix.lastIndexOf('/'), staticPrefix.lastIndexOf(sep))

  if (lastSepIndex === -1) return { baseDir: '', relativePattern: pattern }

  let baseDir = staticPrefix.slice(0, lastSepIndex)
  const relativePattern = pattern.slice(lastSepIndex + 1)

  if (baseDir === '' && lastSepIndex === 0) baseDir = '/'

  if (getPlatform() === 'windows' && /^[A-Za-z]:$/.test(baseDir)) {
    baseDir = baseDir + sep
  }

  return { baseDir, relativePattern }
}
