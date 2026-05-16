/**
 * Git-internal path safety check for PowerShell commands.
 *
 * Prevents sandbox escape via bare-repo attacks where a compound command
 * creates HEAD/objects/refs/hooks/ then runs git — git's hook runner would
 * execute the freshly-created malicious hooks.
 *
 * Ported/adapted from CC's PowerShellTool/gitSafety.ts
 */

import { basename, resolve, sep } from 'path'
import { posix } from 'path'

const GIT_INTERNAL_PREFIXES = ['head', 'objects', 'refs', 'hooks'] as const

// Normalize a PS arg to a canonical path for matching
function normalizeGitPathArg(arg: string): string {
  let s = arg
  // Strip parameter prefix (e.g., -Path:value → value)
  if (s.length > 0 && (s[0] === '-' || s[0] === '/')) {
    const c = s.indexOf(':', 1)
    if (c > 0) s = s.slice(c + 1)
  }
  // Strip quotes and backtick escapes
  s = s.replace(/^['"]|['"]$/g, '').replace(/`/g, '')
  // Normalize backslashes to forward slashes
  s = s.replace(/\\/g, '/')
  // Normalize per-component trailing spaces/dots (Win32 CreateFileW)
  s = s.split('/').map(c => {
    if (c === '') return c
    let prev
    do {
      prev = c
      c = c.replace(/ +$/, '')
      if (c === '.' || c === '..') return c
      c = c.replace(/\.+$/, '')
    } while (c !== prev)
    return c || '.'
  }).join('/')
  s = posix.normalize(s)
  if (s.startsWith('./')) s = s.slice(2)
  return s.toLowerCase()
}

function matchesGitInternalPrefix(n: string): boolean {
  if (n === 'head' || n === '.git') return true
  if (n.startsWith('.git/') || /^git~\d+($|\/)/.test(n)) return true
  for (const p of GIT_INTERNAL_PREFIXES) {
    if (p === 'head') continue
    if (n === p || n.startsWith(p + '/')) return true
  }
  return false
}

function resolveEscapingPathToCwdRelative(n: string, cwd: string): string | null {
  const abs = resolve(cwd, n)
  const cwdWithSep = cwd.endsWith(sep) ? cwd : cwd + sep
  const absLower = abs.toLowerCase()
  const cwdLower = cwd.toLowerCase()
  const cwdWithSepLower = cwdWithSep.toLowerCase()
  if (absLower === cwdLower) return '.'
  if (!absLower.startsWith(cwdWithSepLower)) return null
  return abs.slice(cwdWithSep.length).replace(/\\/g, '/').toLowerCase()
}

function resolveCwdReentry(n: string, cwd: string): string {
  if (!n.startsWith('../')) return n
  const cwdBase = basename(cwd).toLowerCase()
  if (!cwdBase) return n
  const prefix = '../' + cwdBase + '/'
  let s = n
  while (s.startsWith(prefix)) s = s.slice(prefix.length)
  if (s === '../' + cwdBase) return '.'
  return s
}

/**
 * Returns true if the PS command argument resolves to a git-internal path
 * in the current working directory (covers bare-repo and .git/ attacks).
 */
export function isGitInternalPathPS(arg: string, cwd: string): boolean {
  const n = resolveCwdReentry(normalizeGitPathArg(arg), cwd)
  if (matchesGitInternalPrefix(n)) return true
  if (n.startsWith('../') || n.startsWith('/') || /^[a-z]:/.test(n)) {
    const rel = resolveEscapingPathToCwdRelative(n, cwd)
    if (rel !== null && matchesGitInternalPrefix(rel)) return true
  }
  return false
}

/**
 * Heuristic check: does the PS command contain any write to git-internal paths?
 * Matches: New-Item, Out-File, Set-Content, Add-Content, Copy-Item with .git/** targets.
 */
export function commandWritesToGitInternalPath(command: string, cwd: string): boolean {
  // Quick pattern for common write cmdlets followed by git-internal paths
  const WRITE_CMDLET_PATTERN = /\b(?:New-Item|Out-File|Set-Content|Add-Content|Copy-Item|Move-Item|Rename-Item)\b/i
  if (!WRITE_CMDLET_PATTERN.test(command)) return false

  // Extract quoted or unquoted path-like tokens and check each
  const pathTokens = command.match(/['"]([^'"]+)['"]|(\S+)/g) ?? []
  for (const token of pathTokens) {
    const clean = token.replace(/^['"]|['"]$/g, '')
    if (clean.includes('\\') || clean.includes('/') || clean.includes('.git')) {
      if (isGitInternalPathPS(clean, cwd)) return true
    }
  }
  return false
}
