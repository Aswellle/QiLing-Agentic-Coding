// Worktree session state for EnterWorktree / ExitWorktree tools.

export interface WorktreeSession {
  worktreePath: string
  worktreeBranch: string
  originalCwd: string
  originalHeadCommit: string
  createdAt: number
}

let _activeSession: WorktreeSession | null = null

export function getActiveWorktreeSession(): WorktreeSession | null {
  return _activeSession
}

export function setActiveWorktreeSession(s: WorktreeSession | null): void {
  _activeSession = s
}

// ─── Git helpers ──────────────────────────────────────────────────────────────

async function git(args: string[], cwd: string): Promise<{ stdout: string; stderr: string; ok: boolean }> {
  const proc = Bun.spawn(['git', ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  return { stdout: stdout.trim(), stderr: stderr.trim(), ok: code === 0 }
}

export async function getGitRoot(cwd: string): Promise<string | null> {
  const r = await git(['rev-parse', '--show-toplevel'], cwd)
  return r.ok ? r.stdout : null
}

export async function getCurrentCommit(cwd: string): Promise<string | null> {
  const r = await git(['rev-parse', 'HEAD'], cwd)
  return r.ok ? r.stdout : null
}

export async function createWorktree(
  repoRoot: string,
  worktreePath: string,
  branchName: string
): Promise<{ ok: boolean; error?: string }> {
  const r = await git(['worktree', 'add', '-b', branchName, worktreePath], repoRoot)
  return r.ok ? { ok: true } : { ok: false, error: r.stderr }
}

export async function removeWorktree(
  repoRoot: string,
  worktreePath: string,
  force = false
): Promise<{ ok: boolean; error?: string }> {
  const args = ['worktree', 'remove', worktreePath]
  if (force) args.push('--force')
  const r = await git(args, repoRoot)
  if (!r.ok) {
    // Try deleting the branch too if it was ours
    return { ok: false, error: r.stderr }
  }
  return { ok: true }
}

export async function deleteWorktreeBranch(
  repoRoot: string,
  branchName: string
): Promise<void> {
  await git(['branch', '-D', branchName], repoRoot)
}

/** Count uncommitted changes and new commits since originalCommit */
export async function getWorktreeChangeSummary(
  worktreePath: string,
  originalCommit: string
): Promise<{ changedFiles: number; newCommits: number }> {
  const [statusR, commitsR] = await Promise.all([
    git(['status', '--porcelain'], worktreePath),
    git(['rev-list', '--count', `${originalCommit}..HEAD`], worktreePath),
  ])
  const changedFiles = statusR.ok
    ? statusR.stdout.split('\n').filter(Boolean).length
    : 0
  const newCommits = commitsR.ok ? parseInt(commitsR.stdout, 10) || 0 : 0
  return { changedFiles, newCommits }
}
