/**
 * Git worktree management — ported from CC's utils/worktree.ts
 *
 * Provides create/remove/cleanup operations for git worktrees.
 * Used by AgentTool for isolated agent execution environments.
 *
 * CC adaptation: removed tmux, hook-based worktrees, and CC-specific
 * state management. Kept the core worktree lifecycle operations.
 */

import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { findGitRoot } from './gitDiff'

const VALID_SLUG_RE = /^[a-zA-Z0-9._-]+$/
const MAX_SLUG_LENGTH = 64

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate a worktree slug. Throws if invalid.
 * Prevents path traversal (no slashes, no ..)
 */
export function validateWorktreeSlug(slug: string): void {
  if (!slug) throw new Error('Worktree slug cannot be empty')
  const parts = slug.split('/')
  for (const part of parts) {
    if (!VALID_SLUG_RE.test(part) || part === '.' || part === '..') {
      throw new Error(
        `Invalid worktree slug segment: "${part}". Only alphanumeric, dots, hyphens, underscores allowed.`
      )
    }
    if (part.length > MAX_SLUG_LENGTH) {
      throw new Error(`Worktree slug segment too long (max ${MAX_SLUG_LENGTH}): "${part}"`)
    }
  }
}

// ─── Path utilities ───────────────────────────────────────────────────────────

function worktreesDir(repoRoot: string): string {
  return join(repoRoot, '.qiling', 'worktrees')
}

function flattenSlug(slug: string): string {
  return slug.replace(/\//g, '-')
}

export function worktreeBranchName(slug: string): string {
  return `worktree-${flattenSlug(slug)}`
}

function worktreePathFor(repoRoot: string, slug: string): string {
  return join(worktreesDir(repoRoot), flattenSlug(slug))
}

// ─── Git subprocess helpers ───────────────────────────────────────────────────

async function git(
  args: string[],
  cwd = process.cwd(),
): Promise<{ code: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(['git', '--no-optional-locks', ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  return { code: code ?? 0, stdout, stderr }
}

// ─── Core worktree operations ─────────────────────────────────────────────────

export type AgentWorktreeResult = {
  worktreePath: string
  worktreeBranch: string
  headCommit: string
  gitRoot: string
}

/**
 * Create a new git worktree for an agent task.
 * The worktree is created in .qiling/worktrees/<slug> with a new branch.
 *
 * @param slug Unique identifier for this agent worktree
 * @param cwd Working directory (defaults to cwd)
 */
export async function createAgentWorktree(
  slug: string,
  cwd = process.cwd(),
): Promise<AgentWorktreeResult> {
  validateWorktreeSlug(slug)

  const gitRoot = findGitRoot(cwd)
  if (!gitRoot) throw new Error(`Not in a git repository: ${cwd}`)

  const worktreePath = worktreePathFor(gitRoot, slug)
  const branchName = worktreeBranchName(slug)

  // Get current HEAD commit
  const { stdout: headStdout } = await git(['rev-parse', 'HEAD'], cwd)
  const headCommit = headStdout.trim()

  // Ensure worktrees directory exists
  await mkdir(worktreesDir(gitRoot), { recursive: true })

  // Create worktree on new branch
  const { code, stderr } = await git(
    ['worktree', 'add', '-b', branchName, worktreePath],
    gitRoot
  )

  if (code !== 0) {
    throw new Error(`Failed to create worktree: ${stderr}`)
  }

  if (process.env.QILING_DEBUG === '1') {
    console.error(`[worktree] Created: ${worktreePath} (branch: ${branchName})`)
  }

  return { worktreePath, worktreeBranch: branchName, headCommit, gitRoot }
}

/**
 * Remove an agent worktree and optionally delete its branch.
 * Returns true if successfully removed.
 */
export async function removeAgentWorktree(
  worktreePath: string,
  worktreeBranch?: string,
  gitRoot?: string,
): Promise<boolean> {
  const root = gitRoot ?? findGitRoot(process.cwd())
  if (!root) return false

  try {
    // Remove the worktree
    const { code } = await git(['worktree', 'remove', '--force', worktreePath], root)
    if (code !== 0) {
      // Force remove the directory if git worktree remove fails
      if (existsSync(worktreePath)) {
        await rm(worktreePath, { recursive: true, force: true })
      }
    }

    // Clean up the prune state
    await git(['worktree', 'prune'], root)

    // Delete the branch if it was auto-created and no longer needed
    if (worktreeBranch) {
      await git(['branch', '-D', worktreeBranch], root)
    }

    if (process.env.QILING_DEBUG === '1') {
      console.error(`[worktree] Removed: ${worktreePath}`)
    }

    return true
  } catch (err) {
    console.error(`[worktree] Error removing worktree: ${err}`)
    return false
  }
}

/**
 * Check if a worktree has uncommitted changes or commits ahead of the given HEAD.
 */
export async function hasWorktreeChanges(
  worktreePath: string,
  headCommit: string,
): Promise<boolean> {
  const { stdout: statusOut, code: statusCode } = await git(
    ['status', '--porcelain'],
    worktreePath,
  )
  if (statusCode !== 0 || statusOut.trim().length > 0) return true

  const { stdout: revOut } = await git(
    ['rev-list', '--count', `${headCommit}..HEAD`],
    worktreePath,
  )
  return parseInt(revOut.trim(), 10) > 0
}

/**
 * Clean up stale agent worktrees (those with no changes and no active processes).
 */
export async function cleanupStaleAgentWorktrees(
  cwd = process.cwd(),
): Promise<void> {
  const gitRoot = findGitRoot(cwd)
  if (!gitRoot) return

  const dir = worktreesDir(gitRoot)
  if (!existsSync(dir)) return

  try {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const worktreePath = join(dir, entry.name)
      // Check if this is an auto-generated agent worktree branch
      const branchName = `worktree-${entry.name}`
      const { code } = await git(
        ['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`],
        gitRoot,
      )
      if (code !== 0) continue  // Branch doesn't exist, skip

      // Try removing if no lock file (not actively in use)
      const lockFile = join(worktreePath, '.git')
      if (!existsSync(lockFile)) {
        await removeAgentWorktree(worktreePath, branchName, gitRoot).catch(() => {})
      }
    }
  } catch { /* best-effort */ }
}

/**
 * List all active agent worktrees in the repository.
 */
export async function listAgentWorktrees(
  cwd = process.cwd(),
): Promise<Array<{ path: string; branch: string; head: string }>> {
  const { stdout } = await git(['worktree', 'list', '--porcelain'], cwd)
  const entries: Array<{ path: string; branch: string; head: string }> = []
  const blocks = stdout.trim().split('\n\n')

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    const pathLine = lines.find(l => l.startsWith('worktree '))
    const headLine = lines.find(l => l.startsWith('HEAD '))
    const branchLine = lines.find(l => l.startsWith('branch '))

    if (!pathLine) continue
    const path = pathLine.slice('worktree '.length)
    // Only include auto-created agent worktrees
    if (!path.includes('.qiling/worktrees/')) continue

    entries.push({
      path,
      head: headLine ? headLine.slice('HEAD '.length) : '',
      branch: branchLine ? basename(branchLine.slice('branch '.length)) : '',
    })
  }

  return entries
}
