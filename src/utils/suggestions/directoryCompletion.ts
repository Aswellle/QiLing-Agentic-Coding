/**
 * Directory completion utilities — adapted from CC's utils/suggestions/directoryCompletion.ts
 *
 * Provides path completion for the prompt input autocomplete system.
 * LRU-cached directory scans (5 min TTL) to avoid repeated filesystem calls.
 */

import { LRUCache } from 'lru-cache'
import { basename, dirname, join, sep } from 'path'
import { readdir } from 'fs/promises'
import { getCwd } from '../cwd.js'
import { logError } from '../log.js'
import { expandPath } from '../path.js'

function getFsReaddir() { return { readdir: async (p: string) => (await readdir(p, { withFileTypes: true })) as Array<{ name: string; isDirectory(): boolean; isFile(): boolean }> } }

export type DirectoryEntry = { name: string; path: string; type: 'directory' }
export type PathEntry = { name: string; path: string; type: 'directory' | 'file' }
export type CompletionOptions = { basePath?: string; maxResults?: number }
export type PathCompletionOptions = CompletionOptions & { includeFiles?: boolean; includeHidden?: boolean }

type SuggestionItem = { id: string; displayText: string; description?: string; metadata?: unknown }
type ParsedPath = { directory: string; prefix: string }

const CACHE_SIZE = 500, CACHE_TTL = 5 * 60 * 1000
const directoryCache = new LRUCache<string, DirectoryEntry[]>({ max: CACHE_SIZE, ttl: CACHE_TTL })
const pathCache = new LRUCache<string, PathEntry[]>({ max: CACHE_SIZE, ttl: CACHE_TTL })

export function parsePartialPath(partialPath: string, basePath?: string): ParsedPath {
  if (!partialPath) return { directory: basePath || getCwd(), prefix: '' }
  const resolved = expandPath(partialPath, basePath)
  if (partialPath.endsWith('/') || partialPath.endsWith(sep)) return { directory: resolved, prefix: '' }
  return { directory: dirname(resolved), prefix: basename(partialPath) }
}

export async function scanDirectory(dirPath: string): Promise<DirectoryEntry[]> {
  const cached = directoryCache.get(dirPath)
  if (cached) return cached
  try {
    const { readdir: readDir } = getFsReaddir()
    const entries = await readDir(dirPath)
    const directories = entries.filter(e => e.isDirectory() && !e.name.startsWith('.')).map(e => ({ name: e.name, path: join(dirPath, e.name), type: 'directory' as const })).slice(0, 100)
    directoryCache.set(dirPath, directories)
    return directories
  } catch (error) { logError(error); return [] }
}

export async function getDirectoryCompletions(partialPath: string, options: CompletionOptions = {}): Promise<SuggestionItem[]> {
  const { basePath = getCwd(), maxResults = 10 } = options
  const { directory, prefix } = parsePartialPath(partialPath, basePath)
  const entries = await scanDirectory(directory)
  const pL = prefix.toLowerCase()
  return entries.filter(e => e.name.toLowerCase().startsWith(pL)).slice(0, maxResults).map(e => ({ id: e.path, displayText: e.name + '/', description: 'directory', metadata: { type: 'directory' as const } }))
}

export function clearDirectoryCache(): void { directoryCache.clear() }

export function isPathLikeToken(token: string): boolean {
  return token.startsWith('~/') || token.startsWith('/') || token.startsWith('./') || token.startsWith('../') || token === '~' || token === '.' || token === '..'
}

export async function scanDirectoryForPaths(dirPath: string, includeHidden = false): Promise<PathEntry[]> {
  const cacheKey = `${dirPath}:${includeHidden}`
  const cached = pathCache.get(cacheKey)
  if (cached) return cached
  try {
    const { readdir: readDir } = getFsReaddir()
    const entries = await readDir(dirPath)
    const paths = entries.filter(e => includeHidden || !e.name.startsWith('.')).map(e => ({ name: e.name, path: join(dirPath, e.name), type: e.isDirectory() ? 'directory' as const : 'file' as const })).sort((a, b) => { if (a.type === 'directory' && b.type !== 'directory') return -1; if (a.type !== 'directory' && b.type === 'directory') return 1; return a.name.localeCompare(b.name) }).slice(0, 100)
    pathCache.set(cacheKey, paths)
    return paths
  } catch (error) { logError(error); return [] }
}

export async function getPathCompletions(partialPath: string, options: PathCompletionOptions = {}): Promise<SuggestionItem[]> {
  const { basePath = getCwd(), maxResults = 10, includeFiles = true, includeHidden = false } = options
  const { directory, prefix } = parsePartialPath(partialPath, basePath)
  const entries = await scanDirectoryForPaths(directory, includeHidden)
  const pL = prefix.toLowerCase()
  const matches = entries.filter(e => { if (!includeFiles && e.type === 'file') return false; return e.name.toLowerCase().startsWith(pL) }).slice(0, maxResults)
  const hasSep = partialPath.includes('/') || partialPath.includes(sep)
  let dirPortion = ''
  if (hasSep) {
    const lastSep = Math.max(partialPath.lastIndexOf('/'), partialPath.lastIndexOf(sep))
    dirPortion = partialPath.substring(0, lastSep + 1)
  }
  if (dirPortion.startsWith('./') || dirPortion.startsWith('.' + sep)) dirPortion = dirPortion.slice(2)
  return matches.map(e => { const fp = dirPortion + e.name; return { id: fp, displayText: e.type === 'directory' ? fp + '/' : fp, metadata: { type: e.type } } })
}

export function clearPathCache(): void { directoryCache.clear(); pathCache.clear() }
