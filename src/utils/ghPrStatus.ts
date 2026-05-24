/**
 * GitHub PR status fetcher — ported from CC's utils/ghPrStatus.ts
 *
 * Fetches the PR status for the current branch using `gh pr view`.
 * Used to show PR review state in the StatusBar.
 */

import { getBranch } from './gitDiff'
import { getDefaultBranch } from './git'

export type PrReviewState =
  | 'approved'
  | 'pending'
  | 'changes_requested'
  | 'draft'
  | 'merged'
  | 'closed'

export type PrStatus = {
  number: number
  url: string
  reviewState: PrReviewState
}

const GH_TIMEOUT_MS = 5_000

export function deriveReviewState(isDraft: boolean, reviewDecision: string): PrReviewState {
  if (isDraft) return 'draft'
  switch (reviewDecision) {
    case 'APPROVED': return 'approved'
    case 'CHANGES_REQUESTED': return 'changes_requested'
    default: return 'pending'
  }
}

/**
 * Fetch PR status for the current branch using `gh pr view`.
 * Returns null on any failure (gh not installed, no PR, not in git repo, etc).
 */
export async function fetchPrStatus(cwd = process.cwd()): Promise<PrStatus | null> {
  try {
    // Quick check: if gh is not available, skip
    const ghCheck = Bun.spawn(['gh', '--version'], { stdout: 'pipe', stderr: 'pipe', cwd })
    const ghCode = await Promise.race([
      ghCheck.exited,
      new Promise<number>((_, rej) => setTimeout(() => { ghCheck.kill(); rej(new Error('timeout')) }, 2000)),
    ]).catch(() => 1)
    if (ghCode !== 0) return null

    // Get current branch to avoid showing merged PRs from default branch
    const [branch, defaultBranch] = await Promise.all([getBranch(cwd), getDefaultBranch(cwd)])
    if (!branch || branch === '(detached)') return null
    if (branch === defaultBranch) return null

    const proc = Bun.spawn(
      ['gh', 'pr', 'view', '--json', 'number,url,reviewDecision,isDraft,headRefName,state'],
      { stdout: 'pipe', stderr: 'pipe', cwd }
    )
    const timer = setTimeout(() => proc.kill(), GH_TIMEOUT_MS)
    const [stdout, code] = await Promise.all([
      new Response(proc.stdout).text(),
      proc.exited,
    ])
    clearTimeout(timer)

    if (code !== 0 || !stdout.trim()) return null

    const data = JSON.parse(stdout) as {
      number: number; url: string; reviewDecision: string
      isDraft: boolean; headRefName: string; state: string
    }

    // Don't show for PRs from default branches
    if (data.headRefName === defaultBranch || data.headRefName === 'main' || data.headRefName === 'master') return null

    // Don't show for merged/closed PRs
    if (data.state === 'MERGED' || data.state === 'CLOSED') return null

    return { number: data.number, url: data.url, reviewState: deriveReviewState(data.isDraft, data.reviewDecision) }
  } catch {
    return null
  }
}
