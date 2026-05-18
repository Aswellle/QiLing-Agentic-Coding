/**
 * Memory/session file detection — adapted from CC's utils/memoryFileDetection.ts
 *
 * Detects whether file paths or shell commands target special memory files
 * (.qiling/session-memory/, .qiling/projects/*.jsonl) to prevent accidental
 * modification of session state through Bash/FileEdit tools.
 */

import { normalize, posix, win32, sep } from 'node:path'
import { homedir } from 'node:os'
import { join } from 'node:path'

const IS_WINDOWS = process.platform === 'win32'

function toPosix(p: string): string {
  return p.split(win32.sep).join(posix.sep)
}

function toComparable(p: string): string {
  const posixForm = toPosix(p)
  return IS_WINDOWS ? posixForm.toLowerCase() : posixForm
}

function getQilingConfigDir(): string {
  return join(homedir(), '.qiling')
}

// ─── Session file detection ───────────────────────────────────────────────────

export type SessionFileType = 'session_memory' | 'session_transcript'

/**
 * Detect if a file path targets a QiLing session file.
 * Returns the type, or null if not a session file.
 */
export function detectSessionFileType(filePath: string): SessionFileType | null {
  const configDir = getQilingConfigDir()
  const normalized = toComparable(filePath)
  const configDirCmp = toComparable(configDir)

  if (!normalized.startsWith(configDirCmp)) return null

  if (normalized.includes('/session-memory/') && normalized.endsWith('.md')) {
    return 'session_memory'
  }
  if (normalized.includes('/projects/') && normalized.endsWith('.jsonl')) {
    return 'session_transcript'
  }
  return null
}

/**
 * Detect if a glob/grep pattern targets session files.
 */
export function detectSessionPatternType(pattern: string): SessionFileType | null {
  const normalized = toPosix(pattern)
  if (normalized.includes('session-memory') && (normalized.includes('.md') || normalized.endsWith('*'))) {
    return 'session_memory'
  }
  if (normalized.includes('.jsonl') || (normalized.includes('projects') && normalized.includes('*.jsonl'))) {
    return 'session_transcript'
  }
  return null
}

// ─── Auto-memory file detection ───────────────────────────────────────────────

/**
 * Check if a path is inside the auto-memory directory (~/.qiling/projects/<slug>/memory/).
 */
export function isAutoMemFile(filePath: string): boolean {
  const memDir = toComparable(join(getQilingConfigDir(), 'projects'))
  const normalized = toComparable(filePath)
  return normalized.startsWith(memDir) && normalized.includes('/memory/')
}

export type MemoryScope = 'user' | 'project' | 'local'

/**
 * Determine the memory scope for a file path.
 * Returns null if not a memory file.
 */
export function memoryScopeForPath(filePath: string): MemoryScope | null {
  const normalized = toComparable(filePath)
  const configDir = toComparable(getQilingConfigDir())

  if (normalized.startsWith(configDir)) {
    if (normalized.includes('/agent-memory-local/')) return 'local'
    if (normalized.includes('/agent-memory/')) return 'user'
    if (normalized.includes('/memory/')) return 'user'
  }

  // Project-level agent memory
  const cwd = toComparable(process.cwd())
  if (normalized.startsWith(cwd) && normalized.includes('/.qiling/agent-memory')) {
    return normalized.includes('agent-memory-local') ? 'local' : 'project'
  }

  return null
}

/**
 * Check if a file path is an auto-managed memory file (should not be
 * written directly by AI — only through the memory system).
 */
export function isAutoManagedMemoryFile(filePath: string): boolean {
  return isAutoMemFile(filePath) || memoryScopeForPath(filePath) !== null
}

/**
 * Check if a directory path is a memory directory.
 */
export function isMemoryDirectory(dirPath: string): boolean {
  const normalized = toComparable(dirPath)
  return (
    normalized.includes('/agent-memory/') ||
    normalized.includes('/agent-memory-local/') ||
    normalized.includes('/memory/')
  )
}

/**
 * Check if a shell command targets session memory files.
 * Used to warn when Bash tries to edit memory files.
 */
export function isShellCommandTargetingMemory(command: string): boolean {
  // Look for common write operations targeting .qiling paths
  const writePatterns = [
    /\becho\b.*\.qiling.*\.md/,
    /\bcat\b.*>.*\.qiling/,
    /\btee\b.*\.qiling/,
    /\bsed\s+-i\b.*\.qiling/,
    /\bvim?\b.*\.qiling.*\.md/,
  ]
  return writePatterns.some(p => p.test(command))
}

/**
 * Check if a glob/grep pattern targets auto-managed memory files.
 */
export function isAutoManagedMemoryPattern(pattern: string): boolean {
  return detectSessionPatternType(pattern) !== null || toPosix(pattern).includes('/memory/')
}
