/**
 * Path utilities — ported from CC's utils/path.ts (core subset)
 *
 * Key functions:
 * - expandPath(): expand ~ and resolve relative paths
 * - toRelativePath(): make path relative to cwd when possible
 */

import { homedir } from 'os'
import { isAbsolute, join, normalize, relative, resolve } from 'path'

/**
 * Expand ~ notation and resolve relative paths to absolute.
 * Mirrors CC's expandPath() from utils/path.ts.
 *
 * @param path - Path that may contain ~, relative, or absolute forms
 * @param baseDir - Base for relative resolution (default: process.cwd())
 */
export function expandPath(path: string, baseDir = process.cwd()): string {
  if (!path || typeof path !== 'string') throw new TypeError(`Path must be a string, received ${typeof path}`)

  // Expand ~
  if (path === '~') return homedir()
  if (path.startsWith('~/') || path.startsWith('~\\')) {
    return join(homedir(), path.slice(2))
  }

  // Absolute path — just normalize
  if (isAbsolute(path)) return normalize(path)

  // Relative path — resolve from baseDir
  return resolve(baseDir, path)
}

/**
 * Convert an absolute path to relative if it's under cwd.
 * Returns the original path if not under cwd.
 * Mirrors CC's toRelativePath() pattern.
 */
export function toRelativePath(filePath: string, cwd = process.cwd()): string {
  if (!isAbsolute(filePath)) return filePath
  const rel = relative(cwd, filePath)
  // Don't use relative paths that go up too many levels
  if (rel.startsWith('../../')) return filePath
  return rel || filePath
}

/**
 * Check if a path contains path traversal sequences (../).
 * Useful for security validation.
 */
export function containsPathTraversal(path: string): boolean {
  const normalized = normalize(path)
  return normalized.includes('..') || path.includes('../') || path.includes('..\\')
}

import { dirname } from 'path'

/**
 * Get the directory component of a path (respects ~ and UNC paths).
 * Ported from CC's utils/path.ts.
 */
export function getDirectoryForPath(filePath: string): string {
  const absolutePath = expandPath(filePath)
  // SECURITY: Skip filesystem ops for UNC paths to prevent NTLM credential leaks.
  if (absolutePath.startsWith('\\\\') || absolutePath.startsWith('//')) {
    return dirname(absolutePath)
  }
  return dirname(absolutePath)
}

/**
 * Normalize a path for use as a JSON config key.
 * Resolves . and .. segments, converts backslashes to forward slashes.
 * Ported from CC's utils/path.ts.
 */
export function normalizePathForConfigKey(filePath: string): string {
  return normalize(filePath).replace(/\\/g, '/')
}

// FROM CC: utils/sessionStoragePortable.ts via utils/path.ts
// Converts a path into a filesystem-safe string for use as a directory name.
const MAX_SANITIZED_LENGTH = 200
function simpleHash(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}
export function sanitizePath(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9]/g, '-')
  if (sanitized.length <= MAX_SANITIZED_LENGTH) return sanitized
  const hash =
    typeof Bun !== 'undefined' ? Bun.hash(name).toString(36) : simpleHash(name)
  return `${sanitized.slice(0, MAX_SANITIZED_LENGTH)}-${hash}`
}
