/**
 * Comprehensive git utilities — adapted from CC's utils/git.ts
 *
 * Supplements existing gitDiff.ts with the following additions:
 *   getBranch()          — current branch name
 *   getRemoteUrl()       — remote URL (origin)
 *   normalizeGitRemoteUrl() — SSH/HTTPS → canonical form
 *   getIsClean()         — working directory clean check
 *   getChangedFiles()    — list of modified files (status --porcelain)
 *   getFileStatus()      — tracked vs untracked split
 *   getGitState()        — comprehensive state snapshot
 *   hasUnpushedCommits() — local commits not on remote
 *   getIsHeadOnRemote()  — HEAD is on tracking branch
 *   getWorktreeCount()   — number of git worktrees
 *   stashToCleanState()  — stash all changes temporarily
 *
 * Already available in gitDiff.ts:
 *   isGitRepo(), findGitRoot(), fetchGitDiff(), fetchGitDiffHunks(),
 *   fetchSingleFileGitDiff(), parseGitDiff(), parseShortstat()
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { findGitRoot } from './gitDiff'

const execFileAsync = promisify(execFile)

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function git(args: string[], cwd = process.cwd()): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const { stdout, stderr } = await execFileAsync('git', ['--no-optional-locks', ...args], {
      cwd,
      timeout: 10_000,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    })
    return { stdout, stderr, code: 0 }
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number }
    return { stdout: e.stdout ?? '', stderr: e.stderr ?? '', code: e.code ?? 1 }
  }
}

// ─── Core git queries ─────────────────────────────────────────────────────────

/**
 * Get the current branch name. Returns 'HEAD' in detached HEAD state.
 */
export async function getBranch(cwd = process.cwd()): Promise<string> {
  const { stdout, code } = await git(['symbolic-ref', '--short', 'HEAD'], cwd)
  if (code === 0 && stdout.trim()) return stdout.trim()
  // Detached HEAD — return short SHA
  const { stdout: sha } = await git(['rev-parse', '--short', 'HEAD'], cwd)
  return sha.trim() || 'HEAD'
}

/**
 * Get the current HEAD commit hash.
 */
export async function getHead(cwd = process.cwd()): Promise<string> {
  const { stdout } = await git(['rev-parse', 'HEAD'], cwd)
  return stdout.trim()
}

/**
 * Get the default branch (main/master/etc.).
 */
export async function getDefaultBranch(cwd = process.cwd()): Promise<string> {
  // Try remote HEAD ref first
  const { stdout: remote } = await git(['symbolic-ref', 'refs/remotes/origin/HEAD', '--short'], cwd)
  if (remote.trim()) {
    const parts = remote.trim().split('/')
    return parts[parts.length - 1] ?? 'main'
  }
  // Fall back to common names
  for (const name of ['main', 'master', 'develop']) {
    const { code } = await git(['show-ref', '--verify', '--quiet', `refs/heads/${name}`], cwd)
    if (code === 0) return name
  }
  return 'main'
}

/**
 * Get the remote URL for origin.
 */
export async function getRemoteUrl(cwd = process.cwd()): Promise<string | null> {
  const { stdout, code } = await git(['remote', 'get-url', 'origin'], cwd)
  if (code !== 0 || !stdout.trim()) return null
  return stdout.trim()
}

/**
 * Normalize a git remote URL to canonical form: host/owner/repo (no .git, lowercase).
 *
 * Examples:
 *   git@github.com:owner/repo.git → github.com/owner/repo
 *   https://github.com/owner/repo.git → github.com/owner/repo
 */
export function normalizeGitRemoteUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  // SSH: git@host:owner/repo.git
  const sshMatch = trimmed.match(/^git@([^:]+):(.+?)(?:\.git)?$/)
  if (sshMatch?.[1] && sshMatch[2]) {
    return `${sshMatch[1].toLowerCase()}/${sshMatch[2].toLowerCase()}`
  }

  // HTTP(S): https://host/owner/repo.git
  try {
    const u = new URL(trimmed)
    const path = u.pathname.replace(/^\//, '').replace(/\.git$/, '')
    return `${u.hostname.toLowerCase()}/${path.toLowerCase()}`
  } catch { /* not a valid URL */ }

  return null
}

/**
 * Check if the working directory is clean (no uncommitted changes).
 */
export async function getIsClean(options?: { ignoreUntracked?: boolean }, cwd = process.cwd()): Promise<boolean> {
  const args = ['status', '--porcelain']
  if (options?.ignoreUntracked) args.push('-uno')
  const { stdout } = await git(args, cwd)
  return stdout.trim().length === 0
}

/**
 * Get list of changed files (from git status --porcelain).
 */
export async function getChangedFiles(cwd = process.cwd()): Promise<string[]> {
  const { stdout } = await git(['status', '--porcelain'], cwd)
  return stdout
    .trim()
    .split('\n')
    .map(line => line.trim().split(' ').slice(1).join(' ').trim())
    .filter(Boolean)
}

/**
 * Get file status split into tracked/untracked.
 */
export async function getFileStatus(cwd = process.cwd()): Promise<{ tracked: string[]; untracked: string[] }> {
  const { stdout } = await git(['status', '--porcelain'], cwd)
  const tracked: string[] = []
  const untracked: string[] = []

  for (const line of stdout.trim().split('\n').filter(Boolean)) {
    const status = line.slice(0, 2)
    const file = line.slice(3).trim()
    if (!file) continue
    if (status.trim() === '??') untracked.push(file)
    else tracked.push(file)
  }

  return { tracked, untracked }
}

/**
 * Check if HEAD is pushed to the remote tracking branch.
 */
export async function getIsHeadOnRemote(cwd = process.cwd()): Promise<boolean> {
  const { code } = await git(['rev-parse', '@{u}'], cwd)
  return code === 0
}

/**
 * Check if there are local commits not yet pushed to remote.
 */
export async function hasUnpushedCommits(cwd = process.cwd()): Promise<boolean> {
  const { code, stdout } = await git(['log', '@{u}..HEAD', '--oneline'], cwd)
  if (code !== 0) return false
  return stdout.trim().length > 0
}

/**
 * Get the number of git worktrees (including main).
 */
export async function getWorktreeCount(cwd = process.cwd()): Promise<number> {
  const { stdout } = await git(['worktree', 'list', '--porcelain'], cwd)
  const count = (stdout.match(/^worktree /gm) ?? []).length
  return count || 1
}

// ─── Composite state ──────────────────────────────────────────────────────────

export type GitRepoState = {
  commitHash: string
  branchName: string
  remoteUrl: string | null
  isHeadOnRemote: boolean
  isClean: boolean
  worktreeCount: number
}

/**
 * Get a comprehensive snapshot of the current git repository state.
 * All queries run in parallel for performance.
 */
export async function getGitState(cwd = process.cwd()): Promise<GitRepoState | null> {
  if (!findGitRoot(cwd)) return null

  try {
    const [commitHash, branchName, remoteUrl, isHeadOnRemote, isClean, worktreeCount] =
      await Promise.all([
        getHead(cwd),
        getBranch(cwd),
        getRemoteUrl(cwd),
        getIsHeadOnRemote(cwd),
        getIsClean(undefined, cwd),
        getWorktreeCount(cwd),
      ])

    return { commitHash, branchName, remoteUrl, isHeadOnRemote, isClean, worktreeCount }
  } catch {
    return null
  }
}

/**
 * Extract GitHub repo identifier (owner/name) from the remote URL.
 * Returns null if not a github.com remote.
 */
export async function getGithubRepo(cwd = process.cwd()): Promise<string | null> {
  const remoteUrl = await getRemoteUrl(cwd)
  if (!remoteUrl) return null
  const normalized = normalizeGitRemoteUrl(remoteUrl)
  if (!normalized?.startsWith('github.com/')) return null
  return normalized.slice('github.com/'.length)
}

/**
 * Temporarily stash all changes, run a callback, then restore.
 * Returns true if stash was created (changes existed).
 */
export async function stashToCleanState(
  message = 'QiLing auto-stash',
  cwd = process.cwd(),
): Promise<boolean> {
  const { code } = await git(['stash', 'push', '-m', message, '--include-untracked'], cwd)
  return code === 0
}

/**
 * Re-export from gitDiff for convenience
 */
export { isGitRepo, findGitRoot, fetchGitDiff } from './gitDiff'
