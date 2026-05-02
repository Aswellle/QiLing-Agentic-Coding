/**
 * Path validation — ported from CC's pathValidation.ts.
 *
 * Defends against:
 *  - Tilde variants (~user, ~+, ~-) — shell expands differently per user
 *  - Shell expansion chars ($VAR, ${VAR}, $(cmd), %VAR%, =cmd)
 *  - Glob patterns in write operations (path may not match actual target)
 *  - Dangerous removal paths (/, /*, ~, drive roots, system dirs)
 *  - UNC paths (\\server\share — credential leakage on Windows)
 *  - Traversal outside working directory
 */

import path from 'path'
import os from 'os'

export type PathOperation = 'read' | 'write'

export interface PathValidationResult {
  allowed: boolean
  reason?: string
}

// ─── Dangerous removal path detection ────────────────────────────────────────

const DANGEROUS_SYSTEM_DIRS = new Set([
  '/usr', '/usr/bin', '/usr/lib', '/usr/local',
  '/etc', '/bin', '/sbin', '/lib', '/lib64',
  '/proc', '/sys', '/dev', '/boot', '/root',
  '/tmp', '/var', '/opt',
])

const DANGEROUS_WIN_DIRS = new Set([
  'c:\\windows', 'c:\\windows\\system32',
  'c:\\program files', 'c:\\program files (x86)',
])

/** Returns true if this path should never be allowed as a rm/delete target. */
export function isDangerousRemovalPath(inputPath: string): boolean {
  const p = inputPath.trim()
  // Explicit root paths
  if (p === '/' || p === '\\' || p === '.') return true
  // Wildcards at root: /*, ~, ~/*
  if (/^[/\\]\*/.test(p)) return true
  if (/^~\*?$/.test(p)) return true
  if (/^~[/\\]\*/.test(p)) return true
  // Home directory itself
  if (p === os.homedir()) return true

  const normalised = path.resolve(p).toLowerCase()

  // Drive root on Windows: C:\, D:\, etc.
  if (process.platform === 'win32' && /^[a-z]:\\?$/.test(normalised)) return true
  // System directories
  if (DANGEROUS_SYSTEM_DIRS.has(normalised)) return true
  if (DANGEROUS_WIN_DIRS.has(normalised)) return true

  return false
}

// ─── Shell expansion / injection detectors ───────────────────────────────────

const GLOB_PATTERN_RE = /(?<!\\)[*?[\]{]]/

/** Shell-interpretable tilde variants beyond ~/ */
function hasDangerousTilde(p: string): boolean {
  // ~user, ~+, ~-, ~N (POSIX directory stack)
  return /^~[^/\\]/.test(p)
}

function hasShellExpansion(p: string): boolean {
  // $VAR, ${VAR}, $(cmd), %VAR% (Windows), =cmd (zsh)
  return /\$|%[^%]+%/.test(p) || (p.startsWith('=') && !p.startsWith('=:'))
}

function hasUncPath(p: string): boolean {
  return p.startsWith('\\\\')
}

// ─── Main validator ───────────────────────────────────────────────────────────

/**
 * Validate a file path before allowing a read or write operation.
 * Returns allowed=false with a reason string if the path is suspicious.
 */
export function validatePath(
  inputPath: string,
  operation: PathOperation,
  workingDir: string
): PathValidationResult {
  const p = inputPath.trim()

  // 1. Reject UNC paths (credential leak risk on Windows)
  if (hasUncPath(p)) {
    return { allowed: false, reason: `UNC paths are not allowed: ${p}` }
  }

  // 2. Reject tilde variants that aren't simple ~/
  if (hasDangerousTilde(p)) {
    return {
      allowed: false,
      reason: `Tilde user-substitution paths are not allowed: ${p}. Use the explicit path instead.`,
    }
  }

  // 3. Reject shell expansion characters
  if (hasShellExpansion(p)) {
    return {
      allowed: false,
      reason: `Shell expansion characters in path are not allowed: ${p}`,
    }
  }

  // 4. Reject glob patterns in write operations
  if (operation === 'write' && GLOB_PATTERN_RE.test(p)) {
    return {
      allowed: false,
      reason: `Glob patterns are not allowed in write paths: ${p}`,
    }
  }

  // 5. Dangerous removal path guard (applies to write/delete)
  if (operation === 'write' && isDangerousRemovalPath(p)) {
    return {
      allowed: false,
      reason: `Refusing to write/delete a system-critical path: ${p}`,
    }
  }

  // 6. Traverse check: resolved path must stay within workingDir or home
  try {
    const resolved = path.resolve(workingDir, p.replace(/^~[/\\]/, os.homedir() + path.sep))
    const home = os.homedir()
    const wd = path.resolve(workingDir)
    const qilingConfig = path.join(home, '.qiling')

    // Allow: inside working directory, inside ~/.qiling/, or inside home for read
    const inWorkingDir = resolved.startsWith(wd + path.sep) || resolved === wd
    const inQilingConfig = resolved.startsWith(qilingConfig + path.sep) || resolved === qilingConfig
    const inHome = resolved.startsWith(home + path.sep) || resolved === home

    if (!inWorkingDir && !inQilingConfig && !(operation === 'read' && inHome)) {
      return {
        allowed: false,
        reason: `Path is outside the working directory: ${resolved}`,
      }
    }
  } catch {
    // If we can't resolve, let the tool handle the error
  }

  return { allowed: true }
}

/**
 * Quick check for use in classifier — does a bash command touch dangerous paths?
 * Used to upgrade risk level without full validation.
 */
export function commandTouchesDangerousPath(command: string): boolean {
  // Extract paths from common destructive commands
  const rmMatch = command.match(/\brm\b[^;|&]*(-[rRf]+\s+|--recursive\s+|--force\s+)?(.+)/)
  if (rmMatch) {
    const target = rmMatch[2]?.trim() ?? ''
    if (isDangerousRemovalPath(target)) return true
  }
  return false
}
