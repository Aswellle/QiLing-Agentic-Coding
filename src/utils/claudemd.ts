/**
 * CLAUDE.md / QILING.md memory file utilities — adapted from CC's utils/claudemd.ts
 *
 * Handles loading, parsing, and processing of project memory files.
 * QiLing uses QILING.md as primary, with CLAUDE.md as fallback for CC compatibility.
 *
 * File discovery order (same as CC):
 *   1. ~/.qiling/QILING.md (user-global)
 *   2. CLAUDE.md, .qiling/QILING.md (project root, walking up)
 *   3. QILING.local.md (project-local, not checked in)
 */

import { existsSync, readFileSync, statSync } from 'node:fs'
import { join, sep, basename, dirname, resolve } from 'node:path'
import { homedir } from 'node:os'

// ─── Constants ────────────────────────────────────────────────────────────────

export const MAX_MEMORY_CHARACTER_COUNT = 40_000

const TEXT_FILE_EXTENSIONS = new Set([
  '.md', '.txt', '.text', '.json', '.yaml', '.yml', '.toml', '.xml', '.csv',
  '.html', '.htm', '.css', '.scss', '.js', '.ts', '.jsx', '.tsx',
  '.py', '.rb', '.go', '.rs', '.java', '.cpp', '.c', '.h', '.sh',
])

// ─── Types ────────────────────────────────────────────────────────────────────

export type MemoryFileInfo = {
  path: string
  content: string
  size: number
  isUserLevel: boolean
}

// ─── HTML comment stripping ────────────────────────────────────────────────────

/**
 * Strip HTML comments from markdown content.
 * Returns { content, stripped: true } if comments were removed.
 */
export function stripHtmlComments(content: string): {
  content: string
  stripped: boolean
} {
  const stripped = content.replace(/<!--[\s\S]*?-->/g, '').trim()
  return { content: stripped, stripped: stripped !== content }
}

// ─── @include directive processing ────────────────────────────────────────────

const INCLUDE_RE = /^@([./~][\w./~-]+|\w[\w./~-]*)[ \t]*$/m

/**
 * Process @include directives in a memory file.
 * Supported formats:
 *   @./relative/path.md
 *   @~/home/path.md
 *   @/absolute/path.md
 *
 * Returns content with included file contents inserted.
 */
export function processIncludes(
  content: string,
  filePath: string,
  visited = new Set<string>(),
): string {
  const fileDir = dirname(filePath)

  return content.replace(/^@([^\n]+)$/gm, (line, includePath: string) => {
    const trimmed = includePath.trim()
    if (!trimmed) return line

    // Resolve path
    let resolvedPath: string
    if (trimmed.startsWith('~/')) {
      resolvedPath = join(homedir(), trimmed.slice(2))
    } else if (trimmed.startsWith('/')) {
      resolvedPath = trimmed
    } else {
      resolvedPath = resolve(fileDir, trimmed)
    }

    // Check extension is allowed
    const ext = '.' + resolvedPath.split('.').pop()
    if (!TEXT_FILE_EXTENSIONS.has(ext)) return line

    // Prevent circular includes
    if (visited.has(resolvedPath)) return line
    visited.add(resolvedPath)

    if (!existsSync(resolvedPath)) return line

    try {
      const included = readFileSync(resolvedPath, 'utf-8')
      return processIncludes(included, resolvedPath, visited)
    } catch {
      return line
    }
  })
}

// ─── Memory file detection ────────────────────────────────────────────────────

/**
 * Check if a file path is a memory/instruction file (CLAUDE.md, QILING.md, rules/*.md).
 */
export function isMemoryFilePath(filePath: string): boolean {
  const name = basename(filePath)

  // Primary memory files
  if (
    name === 'CLAUDE.md' || name === 'CLAUDE.local.md' ||
    name === 'QILING.md' || name === 'QILING.local.md' ||
    name === 'AGENTS.md'
  ) return true

  // .md files in .claude/rules/ or .qiling/rules/ directories
  if (name.endsWith('.md')) {
    if (
      filePath.includes(`${sep}.claude${sep}rules${sep}`) ||
      filePath.includes(`${sep}.qiling${sep}rules${sep}`)
    ) return true
  }

  return false
}

/**
 * Get all memory file paths for a project directory.
 */
export function getAllMemoryFilePaths(projectDir: string): string[] {
  const paths: string[] = []

  // Global user memory
  const userMemory = join(homedir(), '.qiling', 'QILING.md')
  if (existsSync(userMemory)) paths.push(userMemory)

  // Project-level (walk up from cwd to find root)
  const candidates = [
    join(projectDir, 'CLAUDE.md'),
    join(projectDir, '.claude', 'CLAUDE.md'),
    join(projectDir, 'QILING.md'),
    join(projectDir, '.qiling', 'QILING.md'),
    join(projectDir, 'AGENTS.md'),
  ]

  for (const p of candidates) {
    if (existsSync(p) && !paths.includes(p)) paths.push(p)
  }

  // Local (not checked in)
  const localPaths = [
    join(projectDir, 'CLAUDE.local.md'),
    join(projectDir, 'QILING.local.md'),
  ]
  for (const p of localPaths) {
    if (existsSync(p) && !paths.includes(p)) paths.push(p)
  }

  return paths
}

// ─── Memory file loading ──────────────────────────────────────────────────────

/**
 * Load a memory file and process @include directives.
 */
export function loadMemoryFile(filePath: string): MemoryFileInfo | null {
  if (!existsSync(filePath)) return null
  try {
    const raw = readFileSync(filePath, 'utf-8')
    const { content } = stripHtmlComments(raw)
    const processed = processIncludes(content, filePath)
    const size = Buffer.byteLength(processed, 'utf-8')
    const isUserLevel = filePath.startsWith(homedir())

    return { path: filePath, content: processed, size, isUserLevel }
  } catch {
    return null
  }
}

/**
 * Load all memory files for a project, in correct priority order.
 */
export function loadAllMemoryFiles(projectDir: string): MemoryFileInfo[] {
  return getAllMemoryFilePaths(projectDir)
    .map(p => loadMemoryFile(p))
    .filter((f): f is MemoryFileInfo => f !== null && f.content.trim().length > 0)
}

/**
 * Get files that exceed the recommended character count.
 */
export function getLargeMemoryFiles(files: MemoryFileInfo[]): MemoryFileInfo[] {
  return files.filter(f => f.size > MAX_MEMORY_CHARACTER_COUNT)
}

/**
 * Clear all memory file caches (call after settings or file changes).
 */
export function clearMemoryFileCaches(): void {
  // In QiLing, memory loading is not memoized at this level
  // (memoization happens in context.ts via resetContextCaches)
}
