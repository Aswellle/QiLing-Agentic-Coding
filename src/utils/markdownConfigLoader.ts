/**
 * Markdown config file loader — adapted from CC's utils/markdownConfigLoader.ts
 *
 * Discovers and loads markdown files from .qiling/ subdirectories.
 * Used by skill loaders, output-style loaders, and agent definition loaders.
 *
 * QiLing adaptation: removed GrowthBook, analytics, managed settings;
 * kept the core file discovery and parsing logic.
 */

import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { parseFrontmatter, type FrontmatterData } from './frontmatterParser'

// ─── Config directories ───────────────────────────────────────────────────────

export const QILING_CONFIG_DIRECTORIES = [
  'commands', 'agents', 'output-styles', 'skills', 'workflows',
] as const

export type QilingConfigDirectory = (typeof QILING_CONFIG_DIRECTORIES)[number]

export type MarkdownFile = {
  filePath: string
  baseDir: string
  frontmatter: FrontmatterData
  content: string
  source: 'userSettings' | 'projectSettings' | 'localSettings'
}

// ─── Description extraction ───────────────────────────────────────────────────

/**
 * Extract a description from markdown content (first non-empty line).
 */
export function extractDescriptionFromMarkdown(
  content: string,
  defaultDescription = 'Custom item',
): string {
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const headerMatch = trimmed.match(/^#+\s+(.+)$/)
    const text = headerMatch?.[1] ?? trimmed
    return text.length > 100 ? text.slice(0, 97) + '…' : text
  }
  return defaultDescription
}

// ─── Frontmatter tool parsing ─────────────────────────────────────────────────

/**
 * Parse agent tools from frontmatter.
 * undefined → all tools; [] → no tools.
 */
export function parseAgentToolsFromFrontmatter(toolsValue: unknown): string[] | undefined {
  if (toolsValue === undefined) return undefined
  if (!toolsValue) return []
  const arr = typeof toolsValue === 'string' ? [toolsValue]
    : Array.isArray(toolsValue) ? toolsValue.filter((s): s is string => typeof s === 'string')
    : []
  if (arr.includes('*')) return ['*']
  return arr
}

/**
 * Parse slash command tools from frontmatter.
 * Returns undefined (all tools) or string array.
 */
export function parseSlashCommandToolsFromFrontmatter(toolsValue: unknown): string[] | undefined {
  if (toolsValue === undefined || toolsValue === null) return undefined
  if (!toolsValue) return []
  if (typeof toolsValue === 'string') return toolsValue.split(',').map(s => s.trim()).filter(Boolean)
  if (Array.isArray(toolsValue)) return toolsValue.filter((s): s is string => typeof s === 'string')
  return undefined
}

// ─── Directory traversal ──────────────────────────────────────────────────────

/**
 * Get project directories from cwd up to home (for config file discovery).
 * Returns directories from nearest (highest priority) to farthest.
 */
export function getProjectDirsUpToHome(cwd: string): string[] {
  const home = homedir()
  const dirs: string[] = []
  let current = cwd

  while (current !== home && current !== '/') {
    dirs.push(current)
    const parent = join(current, '..')
    if (parent === current) break
    current = parent
  }

  // Also include home
  dirs.push(home)
  return dirs
}

/**
 * Collect markdown files from a directory, parsing frontmatter.
 */
function loadMarkdownFilesFromDir(
  dir: string,
  source: MarkdownFile['source'],
): MarkdownFile[] {
  if (!existsSync(dir)) return []

  const files: MarkdownFile[] = []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile()) continue
      if (!entry.name.endsWith('.md') && !entry.name.endsWith('.mdx')) continue

      const filePath = join(dir, entry.name)
      try {
        const { readFileSync } = require('node:fs') as typeof import('node:fs')
        const raw = readFileSync(filePath, 'utf-8')
        const { frontmatter, content } = parseFrontmatter(raw, filePath)
        files.push({ filePath, baseDir: dir, frontmatter, content, source })
      } catch { /* skip unreadable files */ }
    }
  } catch { /* skip unreadable dirs */ }

  return files
}

// Cache keyed by "subdir:cwd"
const _cache = new Map<string, MarkdownFile[]>()

/**
 * Load all markdown files for a config subdirectory.
 *
 * Search order (highest priority first):
 *   1. <cwd>/.qiling/<subdir>/ (project)
 *   2. ~/.qiling/<subdir>/ (user)
 *
 * Results are cached by (subdir, cwd) for the session.
 */
export function loadMarkdownFilesForSubdir(
  subdir: QilingConfigDirectory,
  cwd: string,
): MarkdownFile[] {
  const cacheKey = `${subdir}:${cwd}`
  const cached = _cache.get(cacheKey)
  if (cached) return cached

  const files: MarkdownFile[] = []

  // User-level: ~/.qiling/<subdir>/
  const userDir = join(homedir(), '.qiling', subdir)
  files.push(...loadMarkdownFilesFromDir(userDir, 'userSettings'))

  // Project-level: <cwd>/.qiling/<subdir>/
  const projectDir = join(cwd, '.qiling', subdir)
  files.push(...loadMarkdownFilesFromDir(projectDir, 'projectSettings'))

  // Also check .claude/<subdir>/ for CC compatibility
  const claudeDir = join(cwd, '.claude', subdir)
  if (claudeDir !== projectDir) {
    files.push(...loadMarkdownFilesFromDir(claudeDir, 'projectSettings'))
  }

  _cache.set(cacheKey, files)
  return files
}

/**
 * Clear the markdown file cache (call after settings or file changes).
 */
export function clearMarkdownConfigLoaderCache(): void {
  _cache.clear()
}
