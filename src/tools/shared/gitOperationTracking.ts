/**
 * Git operation detection — ported from CC's tools/shared/gitOperationTracking.ts
 *
 * Detects git commit, push, PR creation and other git operations in shell commands.
 * Used to track coding activity metrics without requiring analytics infrastructure.
 *
 * Works for both Bash and PowerShell since they invoke git/gh as external binaries.
 */

// ─── Regex builders ───────────────────────────────────────────────────────────

function gitCmdRe(subcmd: string, suffix = ''): RegExp {
  return new RegExp(
    `\\bgit(?:\\s+-[cC]\\s+\\S+|\\s+--\\S+=\\S+)*\\s+${subcmd}\\b${suffix}`,
  )
}

const GIT_COMMIT_RE = gitCmdRe('commit')
const GIT_PUSH_RE = gitCmdRe('push')
const GIT_CHERRY_PICK_RE = gitCmdRe('cherry-pick')
const GIT_MERGE_RE = gitCmdRe('merge', '(?!-)')
const GIT_REBASE_RE = gitCmdRe('rebase')

export type CommitKind = 'committed' | 'amended' | 'cherry-picked'
export type BranchAction = 'merged' | 'rebased'
export type PrAction = 'created' | 'edited' | 'merged' | 'commented' | 'closed' | 'ready'

const GH_PR_ACTIONS: Array<{ re: RegExp; action: PrAction }> = [
  { re: /\bgh\s+pr\s+create\b/, action: 'created' },
  { re: /\bgh\s+pr\s+edit\b/, action: 'edited' },
  { re: /\bgh\s+pr\s+merge\b/, action: 'merged' },
  { re: /\bgh\s+pr\s+comment\b/, action: 'commented' },
  { re: /\bgh\s+pr\s+close\b/, action: 'closed' },
  { re: /\bgh\s+pr\s+ready\b/, action: 'ready' },
]

// ─── Detection functions ──────────────────────────────────────────────────────

/**
 * Detect if a shell command performs a git commit.
 */
export function detectGitCommit(command: string): CommitKind | null {
  if (!GIT_COMMIT_RE.test(command)) {
    if (GIT_CHERRY_PICK_RE.test(command)) return 'cherry-picked'
    return null
  }
  if (/--amend\b/.test(command)) return 'amended'
  return 'committed'
}

/**
 * Detect if a shell command performs a git push.
 */
export function detectGitPush(command: string): boolean {
  return GIT_PUSH_RE.test(command)
}

/**
 * Detect if a shell command performs a branch action (merge/rebase).
 */
export function detectGitBranchAction(command: string): BranchAction | null {
  if (GIT_MERGE_RE.test(command)) return 'merged'
  if (GIT_REBASE_RE.test(command)) return 'rebased'
  return null
}

/**
 * Detect if a shell command creates/modifies a GitHub/GitLab PR.
 */
export function detectPrAction(command: string): PrAction | null {
  for (const { re, action } of GH_PR_ACTIONS) {
    if (re.test(command)) return action
  }
  // glab MR (GitLab)
  if (/\bglab\s+mr\s+create\b/.test(command)) return 'created'
  if (/\bglab\s+mr\s+merge\b/.test(command)) return 'merged'
  return null
}

/**
 * Full detection: returns all git operations found in a command.
 */
export function detectGitOperation(command: string): {
  commit?: CommitKind
  push?: boolean
  branchAction?: BranchAction
  prAction?: PrAction
} {
  const result: ReturnType<typeof detectGitOperation> = {}

  const commit = detectGitCommit(command)
  if (commit) result.commit = commit

  if (detectGitPush(command)) result.push = true

  const branchAction = detectGitBranchAction(command)
  if (branchAction) result.branchAction = branchAction

  const prAction = detectPrAction(command)
  if (prAction) result.prAction = prAction

  return result
}

/**
 * Check if a command touches git at all (for quick filtering).
 */
export function commandTouchesGit(command: string): boolean {
  return /\bgit\b/.test(command) || /\bgh\b/.test(command) || /\bglab\b/.test(command)
}
