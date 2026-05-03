/**
 * Per-query context injection — ported from CC's context.ts
 *
 * getUserContext() returns: CLAUDE.md content + current date
 * getSystemContext() returns: live git status snapshot (branch, log, user)
 *
 * Both are memoized per process lifetime. CC uses these to inject live
 * system state into every API call as "userContext" / "systemContext" blocks.
 *
 * CC deps replaced: execFileNoThrow → Bun.spawn, memoize → module cache,
 *                   getClaudeMds/getMemoryFiles → QiLing's system prompt loader,
 *                   feature flags → removed (always run).
 */

import { join, resolve, dirname } from 'path'
import { existsSync, readFileSync } from 'fs'

// ─── Git status ───────────────────────────────────────────────────────────────

const MAX_STATUS_CHARS = 2000

async function gitExec(args: string[], cwd: string): Promise<string> {
  try {
    const proc = Bun.spawn(['git', ...args], {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const [out] = await Promise.all([
      new Response(proc.stdout).text(),
      proc.exited,
    ])
    return out.trim()
  } catch {
    return ''
  }
}

async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(['git', 'rev-parse', '--git-dir'], { cwd, stdout: 'pipe', stderr: 'pipe' })
    const code = await proc.exited
    return code === 0
  } catch {
    return false
  }
}

/** Memoized git status for current session (snapshot at query entry, not per-turn). */
let _gitStatusCache: string | null | undefined = undefined

export async function getGitStatus(cwd = process.cwd()): Promise<string | null> {
  if (_gitStatusCache !== undefined) return _gitStatusCache

  if (!(await isGitRepo(cwd))) {
    _gitStatusCache = null
    return null
  }

  try {
    const [branch, mainBranch, status, log, userName] = await Promise.all([
      gitExec(['--no-optional-locks', 'rev-parse', '--abbrev-ref', 'HEAD'], cwd),
      gitExec(['--no-optional-locks', 'symbolic-ref', 'refs/remotes/origin/HEAD', '--short'], cwd)
        .then(s => s.replace(/^origin\//, '') || 'main'),
      gitExec(['--no-optional-locks', 'status', '--short'], cwd),
      gitExec(['--no-optional-locks', 'log', '--oneline', '-n', '5'], cwd),
      gitExec(['config', 'user.name'], cwd),
    ])

    const truncatedStatus = status.length > MAX_STATUS_CHARS
      ? status.slice(0, MAX_STATUS_CHARS) + '\n... (truncated — run "git status" for full output)'
      : status

    _gitStatusCache = [
      'This is the git status at the start of the conversation. Note that this status is a snapshot in time, and will not update during the conversation.',
      `Current branch: ${branch || '(unknown)'}`,
      `Main branch (you will usually use this for PRs): ${mainBranch}`,
      ...(userName ? [`Git user: ${userName}`] : []),
      `Status:\n${truncatedStatus || '(clean)'}`,
      `Recent commits:\n${log || '(none)'}`,
    ].join('\n\n')
    return _gitStatusCache
  } catch {
    _gitStatusCache = null
    return null
  }
}

export function resetGitStatusCache(): void {
  _gitStatusCache = undefined
}

// ─── CLAUDE.md / QILING.md discovery ─────────────────────────────────────────

function findMemoryFiles(startDir: string): string[] {
  const found: string[] = []
  const names = ['CLAUDE.md', 'QILING.md']
  let dir = resolve(startDir)
  while (true) {
    for (const name of names) {
      const candidate = join(dir, name)
      if (existsSync(candidate)) found.push(candidate)
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  // Also check ~/.qiling/CLAUDE.md
  const globalConfig = join(process.env.HOME ?? process.env.USERPROFILE ?? '~', '.qiling', 'CLAUDE.md')
  if (existsSync(globalConfig) && !found.includes(globalConfig)) found.push(globalConfig)
  return found
}

function readMemoryFiles(cwd: string): string | null {
  const files = findMemoryFiles(cwd)
  if (files.length === 0) return null
  const contents = files
    .map(f => {
      try { return `[${f}]\n${readFileSync(f, 'utf-8').trim()}` } catch { return null }
    })
    .filter(Boolean)
  return contents.length > 0 ? contents.join('\n\n---\n\n') : null
}

// ─── getCurrentDate helper ────────────────────────────────────────────────────

function getLocalISODate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ─── Exported context getters ─────────────────────────────────────────────────

let _userContextCache: { [k: string]: string } | undefined = undefined

/**
 * User context: CLAUDE.md / QILING.md content + current date.
 * Injected into system prompt as a user-role block at query start.
 */
export async function getUserContext(cwd = process.cwd()): Promise<{ [k: string]: string }> {
  if (_userContextCache) return _userContextCache
  const claudeMd = readMemoryFiles(cwd)
  _userContextCache = {
    currentDate: `Today's date is ${getLocalISODate()}.`,
    ...(claudeMd ? { claudeMd } : {}),
  }
  return _userContextCache
}

let _systemContextCache: { [k: string]: string } | undefined = undefined

/**
 * System context: git status snapshot.
 * Injected as a structured context block in the system prompt.
 */
export async function getSystemContext(cwd = process.cwd()): Promise<{ [k: string]: string }> {
  if (_systemContextCache) return _systemContextCache
  const gitStatus = await getGitStatus(cwd)
  _systemContextCache = {
    ...(gitStatus ? { gitStatus } : {}),
  }
  return _systemContextCache
}

export function resetContextCaches(): void {
  _userContextCache = undefined
  _systemContextCache = undefined
  resetGitStatusCache()
}

/**
 * Build the context extension for a system prompt.
 * Returns additional text to append, or '' if no context to add.
 */
export function buildContextExtension(
  userContext: { [k: string]: string },
  systemContext: { [k: string]: string },
): string {
  const parts: string[] = []

  if (systemContext.gitStatus) {
    parts.push(`\n# gitStatus\n${systemContext.gitStatus}`)
  }
  if (userContext.currentDate) {
    parts.push(`\n# currentDate\n${userContext.currentDate}`)
  }
  if (userContext.claudeMd) {
    parts.push(`\n# userEmail\nThe user's email is from CLAUDE.md context.`)
    parts.push(`\n# claudeMd\n${userContext.claudeMd}`)
  }

  return parts.join('\n')
}
