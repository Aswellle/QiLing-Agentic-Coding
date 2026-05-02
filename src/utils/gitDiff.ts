/**
 * Git diff analysis — ported from CC's utils/gitDiff.ts
 *
 * Provides: fetchGitDiff(), parseGitNumstat(), parseGitDiff(),
 *           fetchSingleFileGitDiff(), parseShortstat()
 *
 * CC deps replaced: execFileNoThrow → Bun.spawn, getCwd → process.cwd(),
 *                   getCachedRepository → git remote, gitExe → 'git'
 */

import { existsSync, accessSync } from 'fs'
import { readFile } from 'fs/promises'
import { dirname, join, relative, sep } from 'path'

// ─── Types (mirrors CC's gitDiff.ts types) ────────────────────────────────────

export interface StructuredPatchHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: string[]
}

export interface GitDiffStats {
  filesCount: number
  linesAdded: number
  linesRemoved: number
}

export interface PerFileStats {
  added: number
  removed: number
  isBinary: boolean
  isUntracked?: boolean
}

export interface GitDiffResult {
  stats: GitDiffStats
  perFileStats: Map<string, PerFileStats>
  hunks: Map<string, StructuredPatchHunk[]>
}

export interface ToolUseDiff {
  filename: string
  status: 'modified' | 'added'
  additions: number
  deletions: number
  changes: number
  patch: string
  repository: string | null
}

export interface NumstatResult {
  stats: GitDiffStats
  perFileStats: Map<string, PerFileStats>
}

// ─── Constants (identical to CC) ─────────────────────────────────────────────

const GIT_TIMEOUT_MS = 5_000
const MAX_FILES = 50
const MAX_DIFF_SIZE_BYTES = 1_000_000
const MAX_LINES_PER_FILE = 400
const MAX_FILES_FOR_DETAILS = 500
const SINGLE_FILE_DIFF_TIMEOUT_MS = 3_000

// ─── Git helpers ──────────────────────────────────────────────────────────────

async function git(
  args: string[],
  cwd?: string,
  timeoutMs = GIT_TIMEOUT_MS
): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const proc = Bun.spawn(['git', ...args], {
      cwd: cwd ?? process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const timer = setTimeout(() => proc.kill(), timeoutMs)
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])
    clearTimeout(timer)
    return { stdout: stdout.trim(), stderr: stderr.trim(), code: code ?? 1 }
  } catch {
    return { stdout: '', stderr: '', code: 1 }
  }
}

export async function isGitRepo(cwd = process.cwd()): Promise<boolean> {
  const { code } = await git(['rev-parse', '--git-dir'], cwd)
  return code === 0
}

export function findGitRoot(startDir: string): string | null {
  let dir = startDir
  while (true) {
    if (existsSync(join(dir, '.git'))) return dir
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

async function getGitDir(cwd: string): Promise<string | null> {
  const { stdout, code } = await git(['rev-parse', '--git-dir'], cwd)
  if (code !== 0) return null
  const gitDir = stdout.trim()
  return gitDir.startsWith('/') || gitDir.match(/^[A-Z]:/) ? gitDir : join(cwd, gitDir)
}

async function getDefaultBranch(): Promise<string> {
  const { stdout, code } = await git(['symbolic-ref', 'refs/remotes/origin/HEAD', '--short'])
  if (code === 0 && stdout) return stdout.replace(/^origin\//, '')
  // fallback: check if main or master exists
  const { code: mainCode } = await git(['rev-parse', '--verify', 'origin/main'])
  if (mainCode === 0) return 'main'
  return 'master'
}

async function getCachedRepository(): Promise<string | null> {
  try {
    const { stdout, code } = await git(['remote', 'get-url', 'origin'])
    if (code !== 0) return null
    const match = stdout.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

async function isInTransientGitState(cwd = process.cwd()): Promise<boolean> {
  const gitDir = await getGitDir(cwd)
  if (!gitDir) return false
  const transientFiles = ['MERGE_HEAD', 'REBASE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD']
  return transientFiles.some(f => existsSync(join(gitDir, f)))
}

// ─── Core functions (ported verbatim from CC, deps swapped) ──────────────────

/**
 * Fetch git diff stats comparing working tree to HEAD.
 * Returns null if not in a git repo or during merge/rebase.
 */
export async function fetchGitDiff(cwd = process.cwd()): Promise<GitDiffResult | null> {
  if (!(await isGitRepo(cwd))) return null
  if (await isInTransientGitState(cwd)) return null

  // Quick probe — O(1) memory
  const shortstatRes = await git(['--no-optional-locks', 'diff', 'HEAD', '--shortstat'], cwd)
  if (shortstatRes.code === 0) {
    const quickStats = parseShortstat(shortstatRes.stdout)
    if (quickStats && quickStats.filesCount > MAX_FILES_FOR_DETAILS) {
      return { stats: quickStats, perFileStats: new Map(), hunks: new Map() }
    }
  }

  const numstatRes = await git(['--no-optional-locks', 'diff', 'HEAD', '--numstat'], cwd)
  if (numstatRes.code !== 0) return null

  const { stats, perFileStats } = parseGitNumstat(numstatRes.stdout)

  const remainingSlots = MAX_FILES - perFileStats.size
  if (remainingSlots > 0) {
    const untracked = await fetchUntrackedFiles(remainingSlots, cwd)
    if (untracked) {
      stats.filesCount += untracked.size
      for (const [path, fileStats] of untracked) perFileStats.set(path, fileStats)
    }
  }

  return { stats, perFileStats, hunks: new Map() }
}

/** Fetch full diff hunks on-demand (for diff display, not polling). */
export async function fetchGitDiffHunks(cwd = process.cwd()): Promise<Map<string, StructuredPatchHunk[]>> {
  if (!(await isGitRepo(cwd))) return new Map()
  if (await isInTransientGitState(cwd)) return new Map()
  const { stdout, code } = await git(['--no-optional-locks', 'diff', 'HEAD'], cwd)
  if (code !== 0) return new Map()
  return parseGitDiff(stdout)
}

export function parseGitNumstat(stdout: string): NumstatResult {
  const lines = stdout.trim().split('\n').filter(Boolean)
  let added = 0, removed = 0, validFileCount = 0
  const perFileStats = new Map<string, PerFileStats>()

  for (const line of lines) {
    const parts = line.split('\t')
    if (parts.length < 3) continue
    validFileCount++
    const addStr = parts[0]!
    const remStr = parts[1]!
    const filePath = parts.slice(2).join('\t')
    const isBinary = addStr === '-' || remStr === '-'
    const fileAdded = isBinary ? 0 : parseInt(addStr, 10) || 0
    const fileRemoved = isBinary ? 0 : parseInt(remStr, 10) || 0
    added += fileAdded; removed += fileRemoved
    if (perFileStats.size < MAX_FILES) {
      perFileStats.set(filePath, { added: fileAdded, removed: fileRemoved, isBinary })
    }
  }
  return { stats: { filesCount: validFileCount, linesAdded: added, linesRemoved: removed }, perFileStats }
}

export function parseGitDiff(stdout: string): Map<string, StructuredPatchHunk[]> {
  const result = new Map<string, StructuredPatchHunk[]>()
  if (!stdout.trim()) return result

  const fileDiffs = stdout.split(/^diff --git /m).filter(Boolean)
  for (const fileDiff of fileDiffs) {
    if (result.size >= MAX_FILES) break
    if (fileDiff.length > MAX_DIFF_SIZE_BYTES) continue

    const lines = fileDiff.split('\n')
    const headerMatch = lines[0]?.match(/^a\/(.+?) b\/(.+)$/)
    if (!headerMatch) continue
    const filePath = headerMatch[2] ?? headerMatch[1] ?? ''

    const fileHunks: StructuredPatchHunk[] = []
    let currentHunk: StructuredPatchHunk | null = null
    let lineCount = 0

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i] ?? ''
      const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/)
      if (hunkMatch) {
        if (currentHunk) fileHunks.push(currentHunk)
        currentHunk = {
          oldStart: parseInt(hunkMatch[1] ?? '0', 10),
          oldLines: parseInt(hunkMatch[2] ?? '1', 10),
          newStart: parseInt(hunkMatch[3] ?? '0', 10),
          newLines: parseInt(hunkMatch[4] ?? '1', 10),
          lines: [],
        }
        continue
      }
      if (line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++') ||
          line.startsWith('new file') || line.startsWith('deleted file') ||
          line.startsWith('old mode') || line.startsWith('new mode') ||
          line.startsWith('Binary files')) continue

      if (currentHunk && (line.startsWith('+') || line.startsWith('-') || line.startsWith(' ') || line === '')) {
        if (lineCount >= MAX_LINES_PER_FILE) continue
        currentHunk.lines.push('' + line)  // force flat string copy (CC comment: prevent V8 sliced string leak)
        lineCount++
      }
    }
    if (currentHunk) fileHunks.push(currentHunk)
    if (fileHunks.length > 0) result.set(filePath, fileHunks)
  }
  return result
}

export function parseShortstat(stdout: string): GitDiffStats | null {
  const match = stdout.match(
    /(\d+)\s+files?\s+changed(?:,\s+(\d+)\s+insertions?\(\+\))?(?:,\s+(\d+)\s+deletions?\(-\))?/
  )
  if (!match) return null
  return {
    filesCount: parseInt(match[1] ?? '0', 10),
    linesAdded: parseInt(match[2] ?? '0', 10),
    linesRemoved: parseInt(match[3] ?? '0', 10),
  }
}

async function fetchUntrackedFiles(maxFiles: number, cwd: string): Promise<Map<string, PerFileStats> | null> {
  const { stdout, code } = await git(
    ['--no-optional-locks', 'ls-files', '--others', '--exclude-standard'], cwd
  )
  if (code !== 0 || !stdout.trim()) return null
  const paths = stdout.split('\n').filter(Boolean)
  const perFileStats = new Map<string, PerFileStats>()
  for (const p of paths.slice(0, maxFiles)) {
    perFileStats.set(p, { added: 0, removed: 0, isBinary: false, isUntracked: true })
  }
  return perFileStats.size > 0 ? perFileStats : null
}

export async function fetchSingleFileGitDiff(
  absoluteFilePath: string,
  cwd = process.cwd()
): Promise<ToolUseDiff | null> {
  const gitRoot = findGitRoot(dirname(absoluteFilePath))
  if (!gitRoot) return null

  const gitPath = relative(gitRoot, absoluteFilePath).split(sep).join('/')
  const repository = await getCachedRepository()

  const { code: lsCode } = await git(
    ['--no-optional-locks', 'ls-files', '--error-unmatch', gitPath], gitRoot, SINGLE_FILE_DIFF_TIMEOUT_MS
  )

  if (lsCode === 0) {
    const diffRef = await getDiffRef(gitRoot)
    const { stdout, code } = await git(
      ['--no-optional-locks', 'diff', diffRef, '--', gitPath], gitRoot, SINGLE_FILE_DIFF_TIMEOUT_MS
    )
    if (code !== 0 || !stdout) return null
    return { ...parseRawDiffToToolUseDiff(gitPath, stdout, 'modified'), repository }
  }

  const synth = await generateSyntheticDiff(gitPath, absoluteFilePath)
  if (!synth) return null
  return { ...synth, repository }
}

async function getDiffRef(gitRoot: string): Promise<string> {
  const baseBranch = process.env.CLAUDE_CODE_BASE_REF || (await getDefaultBranch())
  const { stdout, code } = await git(
    ['--no-optional-locks', 'merge-base', 'HEAD', baseBranch], gitRoot, SINGLE_FILE_DIFF_TIMEOUT_MS
  )
  return code === 0 && stdout.trim() ? stdout.trim() : 'HEAD'
}

function parseRawDiffToToolUseDiff(
  filename: string, rawDiff: string, status: 'modified' | 'added'
): Omit<ToolUseDiff, 'repository'> {
  const lines = rawDiff.split('\n')
  const patchLines: string[] = []
  let inHunks = false, additions = 0, deletions = 0
  for (const line of lines) {
    if (line.startsWith('@@')) inHunks = true
    if (inHunks) {
      patchLines.push(line)
      if (line.startsWith('+') && !line.startsWith('+++')) additions++
      else if (line.startsWith('-') && !line.startsWith('---')) deletions++
    }
  }
  return { filename, status, additions, deletions, changes: additions + deletions, patch: patchLines.join('\n') }
}

async function generateSyntheticDiff(
  gitPath: string, absoluteFilePath: string
): Promise<Omit<ToolUseDiff, 'repository'> | null> {
  try {
    const content = await readFile(absoluteFilePath, 'utf-8')
    const lines = content.split('\n')
    if (lines.at(-1) === '') lines.pop()
    const lineCount = lines.length
    const addedLines = lines.map(l => `+${l}`).join('\n')
    return {
      filename: gitPath,
      status: 'added',
      additions: lineCount,
      deletions: 0,
      changes: lineCount,
      patch: `@@ -0,0 +1,${lineCount} @@\n${addedLines}`,
    }
  } catch { return null }
}

/** Format diff stats as compact string, e.g. "+42 -7 (3 files)" */
export function formatDiffStats(stats: GitDiffStats): string {
  const parts: string[] = []
  if (stats.linesAdded > 0) parts.push(`+${stats.linesAdded}`)
  if (stats.linesRemoved > 0) parts.push(`-${stats.linesRemoved}`)
  if (stats.filesCount > 0) parts.push(`(${stats.filesCount} 个文件)`)
  return parts.join(' ') || '无变更'
}
