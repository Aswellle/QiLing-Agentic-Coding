/**
 * Git-internal path safety check for PowerShell commands.
 *
 * Prevents sandbox escape via bare-repo attacks where a compound command
 * creates HEAD/objects/refs/hooks/ then runs git — git's hook runner would
 * execute the freshly-created malicious hooks.
 *
 * Ported from CC's PowerShellTool/gitSafety.ts
 */

import { basename, posix, resolve, sep } from 'path'
import { PS_TOKENIZER_DASH_CHARS } from '../../utils/powershell/parser'

function resolveCwdReentry(normalized: string): string {
  if (!normalized.startsWith('../')) return normalized
  const cwdBase = basename(process.cwd()).toLowerCase()
  if (!cwdBase) return normalized
  const prefix = '../' + cwdBase + '/'
  let s = normalized
  while (s.startsWith(prefix)) {
    s = s.slice(prefix.length)
  }
  if (s === '../' + cwdBase) return '.'
  return s
}

function normalizeGitPathArg(arg: string): string {
  let s = arg
  if (s.length > 0 && (PS_TOKENIZER_DASH_CHARS.has(s[0]!) || s[0] === '/')) {
    const c = s.indexOf(':', 1)
    if (c > 0) s = s.slice(c + 1)
  }
  s = s.replace(/^['"]|['"]$/g, '')
  s = s.replace(/`/g, '')
  s = s.replace(/^(?:[A-Za-z0-9_.]+\\){0,3}FileSystem::/i, '')
  s = s.replace(/^[A-Za-z]:(?![/\\])/, '')
  s = s.replace(/\\/g, '/')
  s = s
    .split('/')
    .map(c => {
      if (c === '') return c
      let prev
      do {
        prev = c
        c = c.replace(/ +$/, '')
        if (c === '.' || c === '..') return c
        c = c.replace(/\.+$/, '')
      } while (c !== prev)
      return c || '.'
    })
    .join('/')
  s = posix.normalize(s)
  if (s.startsWith('./')) s = s.slice(2)
  return s.toLowerCase()
}

const GIT_INTERNAL_PREFIXES = ['head', 'objects', 'refs', 'hooks'] as const

function resolveEscapingPathToCwdRelative(n: string): string | null {
  const cwd = process.cwd()
  const abs = resolve(cwd, n)
  const cwdWithSep = cwd.endsWith(sep) ? cwd : cwd + sep
  const absLower = abs.toLowerCase()
  const cwdLower = cwd.toLowerCase()
  const cwdWithSepLower = cwdWithSep.toLowerCase()
  if (absLower === cwdLower) return '.'
  if (!absLower.startsWith(cwdWithSepLower)) return null
  return abs.slice(cwdWithSep.length).replace(/\\/g, '/').toLowerCase()
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

/**
 * True if arg (raw PS arg text) resolves to a git-internal path in cwd.
 * Covers both bare-repo paths (hooks/, refs/) and standard-repo paths
 * (.git/hooks/, .git/config).
 */
export function isGitInternalPathPS(arg: string): boolean {
  const n = resolveCwdReentry(normalizeGitPathArg(arg))
  if (matchesGitInternalPrefix(n)) return true
  if (n.startsWith('../') || n.startsWith('/') || /^[a-z]:/.test(n)) {
    const rel = resolveEscapingPathToCwdRelative(n)
    if (rel !== null && matchesGitInternalPrefix(rel)) return true
  }
  return false
}

/**
 * True if arg resolves to a path inside .git/ (standard-repo metadata dir).
 */
export function isDotGitPathPS(arg: string): boolean {
  const n = resolveCwdReentry(normalizeGitPathArg(arg))
  if (matchesDotGitPrefix(n)) return true
  if (n.startsWith('../') || n.startsWith('/') || /^[a-z]:/.test(n)) {
    const rel = resolveEscapingPathToCwdRelative(n)
    if (rel !== null && matchesDotGitPrefix(rel)) return true
  }
  return false
}

function matchesDotGitPrefix(n: string): boolean {
  if (n === '.git' || n.startsWith('.git/')) return true
  return /^git~\d+($|\/)/.test(n)
}

/**
 * Heuristic check: does the PS command contain any write to git-internal paths?
 * Used by PowerShellTool.checkPermissions for a quick pre-parse check.
 */
export function commandWritesToGitInternalPath(command: string): boolean {
  const WRITE_CMDLET_PATTERN = /\b(?:New-Item|Out-File|Set-Content|Add-Content|Copy-Item|Move-Item|Rename-Item)\b/i
  if (!WRITE_CMDLET_PATTERN.test(command)) return false

  const pathTokens = command.match(/['"]([^'"]+)['"]|(\S+)/g) ?? []
  for (const token of pathTokens) {
    const clean = token.replace(/^['"]|['"]$/g, '')
    if (clean.includes('\\') || clean.includes('/') || clean.includes('.git')) {
      if (isGitInternalPathPS(clean)) return true
    }
  }
  return false
}
