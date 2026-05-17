/**
 * Filesystem-based git state reading — avoids spawning git subprocesses.
 *
 * Covers: resolving .git directories (including worktrees/submodules),
 * parsing HEAD, resolving refs via loose files and packed-refs,
 * and the GitFileWatcher that caches branch/SHA with fs.watchFile.
 *
 * Correctness notes (verified against git source):
 *   - HEAD: `ref: refs/heads/<branch>\n` or raw SHA (refs/files-backend.c)
 *   - Packed-refs: `<sha> <refname>\n`, skip `#` and `^` lines (packed-backend.c)
 *   - .git file (worktree): `gitdir: <path>\n` with optional relative path (setup.c)
 *   - Shallow: mere existence of `<commonDir>/shallow` means shallow (shallow.c)
 *
 * Adaptations from CC:
 *   - getCwd() → process.cwd()
 *   - findGitRoot imported from ../gitDiff
 *   - registerCleanup removed — stopWatching called in stop()
 *   - waitForScrollIdle removed — HEAD changes fire synchronously
 */

import { unwatchFile, watchFile } from 'fs'
import { readdir, readFile, stat } from 'fs/promises'
import { join, resolve } from 'path'
import { findGitRoot } from '../gitDiff'
import { parseGitConfigValue } from './gitConfigParser'

// ---------------------------------------------------------------------------
// resolveGitDir — find the actual .git directory
// ---------------------------------------------------------------------------

const resolveGitDirCache = new Map<string, string | null>()

/** Clear cached git dir resolutions. Exported for testing only. */
export function clearResolveGitDirCache(): void {
  resolveGitDirCache.clear()
}

/**
 * Resolve the actual .git directory for a repo.
 * Handles worktrees/submodules where .git is a file containing `gitdir: <path>`.
 * Memoized per startPath.
 */
export async function resolveGitDir(
  startPath?: string,
): Promise<string | null> {
  const cwd = resolve(startPath ?? process.cwd())
  const cached = resolveGitDirCache.get(cwd)
  if (cached !== undefined) {
    return cached
  }

  const root = findGitRoot(cwd)
  if (!root) {
    resolveGitDirCache.set(cwd, null)
    return null
  }

  const gitPath = join(root, '.git')
  try {
    const st = await stat(gitPath)
    if (st.isFile()) {
      // Worktree or submodule: .git is a file with `gitdir: <path>`
      // Git strips trailing \n and \r (setup.c read_gitfile_gently).
      const content = (await readFile(gitPath, 'utf-8')).trim()
      if (content.startsWith('gitdir:')) {
        const rawDir = content.slice('gitdir:'.length).trim()
        const resolved = resolve(root, rawDir)
        resolveGitDirCache.set(cwd, resolved)
        return resolved
      }
    }
    // Regular repo: .git is a directory
    resolveGitDirCache.set(cwd, gitPath)
    return gitPath
  } catch {
    resolveGitDirCache.set(cwd, null)
    return null
  }
}

// ---------------------------------------------------------------------------
// isSafeRefName — validate ref/branch names read from .git/
// ---------------------------------------------------------------------------

/**
 * Validate that a ref/branch name read from .git/ is safe to use in path
 * joins, as git positional arguments, and when interpolated into shell
 * commands. Allowlist: ASCII alphanumerics, `/`, `.`, `_`, `+`, `-`, `@` only.
 */
export function isSafeRefName(name: string): boolean {
  if (!name || name.startsWith('-') || name.startsWith('/')) {
    return false
  }
  if (name.includes('..')) {
    return false
  }
  // Reject single-dot and empty path components
  if (name.split('/').some(c => c === '.' || c === '')) {
    return false
  }
  // Allowlist-only: alphanumerics, /, ., _, +, -, @
  if (!/^[a-zA-Z0-9/._+@-]+$/.test(name)) {
    return false
  }
  return true
}

/**
 * Validate that a string is a git SHA: 40 hex chars (SHA-1) or 64 hex chars
 * (SHA-256). Git never writes abbreviated SHAs to HEAD or ref files.
 */
export function isValidGitSha(s: string): boolean {
  return /^[0-9a-f]{40}$/.test(s) || /^[0-9a-f]{64}$/.test(s)
}

// ---------------------------------------------------------------------------
// readGitHead — parse .git/HEAD
// ---------------------------------------------------------------------------

/**
 * Parse .git/HEAD to determine current branch or detached SHA.
 *
 * HEAD format (per git source, refs/files-backend.c):
 *   - `ref: refs/heads/<branch>\n`  — on a branch
 *   - `ref: <other-ref>\n`          — unusual symref (e.g. during bisect)
 *   - `<hex-sha>\n`                 — detached HEAD (e.g. during rebase)
 */
export async function readGitHead(
  gitDir: string,
): Promise<
  { type: 'branch'; name: string } | { type: 'detached'; sha: string } | null
> {
  try {
    const content = (await readFile(join(gitDir, 'HEAD'), 'utf-8')).trim()
    if (content.startsWith('ref:')) {
      const ref = content.slice('ref:'.length).trim()
      if (ref.startsWith('refs/heads/')) {
        const name = ref.slice('refs/heads/'.length)
        if (!isSafeRefName(name)) {
          return null
        }
        return { type: 'branch', name }
      }
      // Unusual symref (not a local branch) — resolve to SHA
      if (!isSafeRefName(ref)) {
        return null
      }
      const sha = await resolveRef(gitDir, ref)
      return sha ? { type: 'detached', sha } : { type: 'detached', sha: '' }
    }
    // Raw SHA (detached HEAD)
    if (!isValidGitSha(content)) {
      return null
    }
    return { type: 'detached', sha: content }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// resolveRef — resolve loose/packed refs to SHAs
// ---------------------------------------------------------------------------

/**
 * Resolve a git ref (e.g. `refs/heads/main`) to a commit SHA.
 * Checks loose ref files first, then falls back to packed-refs.
 * For worktrees, checks the common gitdir for shared refs.
 */
export async function resolveRef(
  gitDir: string,
  ref: string,
): Promise<string | null> {
  const result = await resolveRefInDir(gitDir, ref)
  if (result) {
    return result
  }

  // For worktrees: try the common gitdir where shared refs live
  const commonDir = await getCommonDir(gitDir)
  if (commonDir && commonDir !== gitDir) {
    return resolveRefInDir(commonDir, ref)
  }

  return null
}

async function resolveRefInDir(
  dir: string,
  ref: string,
): Promise<string | null> {
  // Try loose ref file
  try {
    const content = (await readFile(join(dir, ref), 'utf-8')).trim()
    if (content.startsWith('ref:')) {
      const target = content.slice('ref:'.length).trim()
      if (!isSafeRefName(target)) {
        return null
      }
      return resolveRef(dir, target)
    }
    if (!isValidGitSha(content)) {
      return null
    }
    return content
  } catch {
    // Loose ref doesn't exist, try packed-refs
  }

  try {
    const packed = await readFile(join(dir, 'packed-refs'), 'utf-8')
    for (const line of packed.split('\n')) {
      if (line.startsWith('#') || line.startsWith('^')) {
        continue
      }
      const spaceIdx = line.indexOf(' ')
      if (spaceIdx === -1) {
        continue
      }
      if (line.slice(spaceIdx + 1) === ref) {
        const sha = line.slice(0, spaceIdx)
        return isValidGitSha(sha) ? sha : null
      }
    }
  } catch {
    // No packed-refs
  }

  return null
}

/**
 * Read the `commondir` file to find the shared git directory.
 * In a worktree, this points to the main repo's .git dir.
 * Returns null if no commondir file exists (regular repo).
 */
export async function getCommonDir(gitDir: string): Promise<string | null> {
  try {
    const content = (await readFile(join(gitDir, 'commondir'), 'utf-8')).trim()
    return resolve(gitDir, content)
  } catch {
    return null
  }
}

/**
 * Read a raw symref file and extract the branch name after a known prefix.
 * Returns null if the ref doesn't exist, isn't a symref, or doesn't match the prefix.
 */
export async function readRawSymref(
  gitDir: string,
  refPath: string,
  branchPrefix: string,
): Promise<string | null> {
  try {
    const content = (await readFile(join(gitDir, refPath), 'utf-8')).trim()
    if (content.startsWith('ref:')) {
      const target = content.slice('ref:'.length).trim()
      if (target.startsWith(branchPrefix)) {
        const name = target.slice(branchPrefix.length)
        if (!isSafeRefName(name)) {
          return null
        }
        return name
      }
    }
  } catch {
    // Not a loose ref
  }
  return null
}

// ---------------------------------------------------------------------------
// GitFileWatcher — watches git files and caches derived values.
// Lazily initialized on first cache access. Invalidates all cached
// values when any watched file changes.
// ---------------------------------------------------------------------------

type CacheEntry<T> = {
  value: T
  dirty: boolean
  compute: () => Promise<T>
}

const WATCH_INTERVAL_MS = process.env.NODE_ENV === 'test' ? 10 : 1000

class GitFileWatcher {
  private gitDir: string | null = null
  private commonDir: string | null = null
  private initialized = false
  private initPromise: Promise<void> | null = null
  private watchedPaths: string[] = []
  private branchRefPath: string | null = null
  private cache = new Map<string, CacheEntry<unknown>>()

  async ensureStarted(): Promise<void> {
    if (this.initialized) {
      return
    }
    if (this.initPromise) {
      return this.initPromise
    }
    this.initPromise = this.start()
    return this.initPromise
  }

  private async start(): Promise<void> {
    this.gitDir = await resolveGitDir()
    this.initialized = true
    if (!this.gitDir) {
      return
    }

    // In a worktree, branch refs and the main config are shared and live in
    // commonDir, not the per-worktree gitDir.
    this.commonDir = await getCommonDir(this.gitDir)

    // Watch .git/HEAD and .git/config
    this.watchPath(join(this.gitDir, 'HEAD'), () => {
      void this.onHeadChanged()
    })
    // Config (remote URLs) lives in commonDir for worktrees
    this.watchPath(join(this.commonDir ?? this.gitDir, 'config'), () => {
      this.invalidate()
    })

    // Watch the current branch's ref file for commit changes
    await this.watchCurrentBranchRef()

    // No global cleanup registration — call stop() explicitly when done
  }

  private watchPath(path: string, callback: () => void): void {
    this.watchedPaths.push(path)
    watchFile(path, { interval: WATCH_INTERVAL_MS }, callback)
  }

  /**
   * Watch the loose ref file for the current branch.
   * Called on startup and whenever HEAD changes (branch switch).
   */
  private async watchCurrentBranchRef(): Promise<void> {
    if (!this.gitDir) {
      return
    }

    const head = await readGitHead(this.gitDir)
    // Branch refs live in commonDir for worktrees (gitDir for regular repos)
    const refsDir = this.commonDir ?? this.gitDir
    const refPath =
      head?.type === 'branch' ? join(refsDir, 'refs', 'heads', head.name) : null

    // Already watching this ref (or already not watching anything)
    if (refPath === this.branchRefPath) {
      return
    }

    // Stop watching old branch ref
    if (this.branchRefPath) {
      unwatchFile(this.branchRefPath)
      this.watchedPaths = this.watchedPaths.filter(
        p => p !== this.branchRefPath,
      )
    }

    this.branchRefPath = refPath

    if (!refPath) {
      return
    }

    // The ref file may not exist yet (new branch before first commit).
    // watchFile works on nonexistent files — it fires when the file appears.
    this.watchPath(refPath, () => {
      this.invalidate()
    })
  }

  private async onHeadChanged(): Promise<void> {
    // HEAD changed — could be a branch switch or detach.
    // invalidate() is cheap, do it first so cache correctly serves
    // stale-marked values until the watcher updates.
    this.invalidate()
    // waitForScrollIdle removed — not applicable outside CC's TUI bootstrap
    await this.watchCurrentBranchRef()
  }

  private invalidate(): void {
    for (const entry of this.cache.values()) {
      entry.dirty = true
    }
  }

  /** Stop all file watchers. Call this when the watcher is no longer needed. */
  stop(): void {
    for (const path of this.watchedPaths) {
      unwatchFile(path)
    }
    this.watchedPaths = []
    this.branchRefPath = null
  }

  /**
   * Get a cached value by key. On first call for a key, computes and caches it.
   * Subsequent calls return the cached value until a watched file changes.
   */
  async get<T>(key: string, compute: () => Promise<T>): Promise<T> {
    await this.ensureStarted()
    const existing = this.cache.get(key)
    if (existing && !existing.dirty) {
      return existing.value as T
    }
    if (existing) {
      existing.dirty = false
    }
    const value = await compute()
    const entry = this.cache.get(key)
    if (entry && !entry.dirty) {
      entry.value = value
    }
    if (!entry) {
      this.cache.set(key, { value, dirty: false, compute })
    }
    return value
  }

  /** Reset all state. Stops file watchers. For testing only. */
  reset(): void {
    this.stop()
    this.cache.clear()
    this.initialized = false
    this.initPromise = null
    this.gitDir = null
    this.commonDir = null
  }
}

const gitWatcher = new GitFileWatcher()

async function computeBranch(): Promise<string> {
  const gitDir = await resolveGitDir()
  if (!gitDir) {
    return 'HEAD'
  }
  const head = await readGitHead(gitDir)
  if (!head) {
    return 'HEAD'
  }
  return head.type === 'branch' ? head.name : 'HEAD'
}

async function computeHead(): Promise<string> {
  const gitDir = await resolveGitDir()
  if (!gitDir) {
    return ''
  }
  const head = await readGitHead(gitDir)
  if (!head) {
    return ''
  }
  if (head.type === 'branch') {
    return (await resolveRef(gitDir, `refs/heads/${head.name}`)) ?? ''
  }
  return head.sha
}

async function computeRemoteUrl(): Promise<string | null> {
  const gitDir = await resolveGitDir()
  if (!gitDir) {
    return null
  }
  const url = await parseGitConfigValue(gitDir, 'remote', 'origin', 'url')
  if (url) {
    return url
  }
  // In worktrees, the config with remote URLs is in the common dir
  const commonDir = await getCommonDir(gitDir)
  if (commonDir && commonDir !== gitDir) {
    return parseGitConfigValue(commonDir, 'remote', 'origin', 'url')
  }
  return null
}

async function computeDefaultBranch(): Promise<string> {
  const gitDir = await resolveGitDir()
  if (!gitDir) {
    return 'main'
  }
  // refs/remotes/ lives in commonDir, not the per-worktree gitDir
  const commonDir = (await getCommonDir(gitDir)) ?? gitDir
  const branchFromSymref = await readRawSymref(
    commonDir,
    'refs/remotes/origin/HEAD',
    'refs/remotes/origin/',
  )
  if (branchFromSymref) {
    return branchFromSymref
  }
  for (const candidate of ['main', 'master']) {
    const sha = await resolveRef(commonDir, `refs/remotes/origin/${candidate}`)
    if (sha) {
      return candidate
    }
  }
  return 'main'
}

export function getCachedBranch(): Promise<string> {
  return gitWatcher.get('branch', computeBranch)
}

export function getCachedHead(): Promise<string> {
  return gitWatcher.get('head', computeHead)
}

export function getCachedRemoteUrl(): Promise<string | null> {
  return gitWatcher.get('remoteUrl', computeRemoteUrl)
}

export function getCachedDefaultBranch(): Promise<string> {
  return gitWatcher.get('defaultBranch', computeDefaultBranch)
}

/** Reset the git file watcher state. For testing only. */
export function resetGitFileWatcher(): void {
  gitWatcher.reset()
}

/**
 * Read the HEAD SHA for an arbitrary directory (not using the watcher).
 * Used by plugins that need the HEAD of a specific repo, not the CWD repo.
 */
export async function getHeadForDir(cwd: string): Promise<string | null> {
  const gitDir = await resolveGitDir(cwd)
  if (!gitDir) {
    return null
  }
  const head = await readGitHead(gitDir)
  if (!head) {
    return null
  }
  if (head.type === 'branch') {
    return resolveRef(gitDir, `refs/heads/${head.name}`)
  }
  return head.sha
}

/**
 * Read the HEAD SHA for a git worktree directory (not the main repo).
 *
 * Unlike `getHeadForDir`, this reads `<worktreePath>/.git` directly as a
 * `gitdir:` pointer file, with no upward walk.
 */
export async function readWorktreeHeadSha(
  worktreePath: string,
): Promise<string | null> {
  let gitDir: string
  try {
    const ptr = (await readFile(join(worktreePath, '.git'), 'utf-8')).trim()
    if (!ptr.startsWith('gitdir:')) {
      return null
    }
    gitDir = resolve(worktreePath, ptr.slice('gitdir:'.length).trim())
  } catch {
    return null
  }
  const head = await readGitHead(gitDir)
  if (!head) {
    return null
  }
  if (head.type === 'branch') {
    return resolveRef(gitDir, `refs/heads/${head.name}`)
  }
  return head.sha
}

/**
 * Read the remote origin URL for an arbitrary directory via .git/config.
 */
export async function getRemoteUrlForDir(cwd: string): Promise<string | null> {
  const gitDir = await resolveGitDir(cwd)
  if (!gitDir) {
    return null
  }
  const url = await parseGitConfigValue(gitDir, 'remote', 'origin', 'url')
  if (url) {
    return url
  }
  // In worktrees, the config with remote URLs is in the common dir
  const commonDir = await getCommonDir(gitDir)
  if (commonDir && commonDir !== gitDir) {
    return parseGitConfigValue(commonDir, 'remote', 'origin', 'url')
  }
  return null
}

/**
 * Check if we're in a shallow clone by looking for <commonDir>/shallow.
 * Per git's shallow.c, mere existence of the file means shallow.
 */
export async function isShallowClone(): Promise<boolean> {
  const gitDir = await resolveGitDir()
  if (!gitDir) {
    return false
  }
  const commonDir = (await getCommonDir(gitDir)) ?? gitDir
  try {
    await stat(join(commonDir, 'shallow'))
    return true
  } catch {
    return false
  }
}

/**
 * Count worktrees by reading <commonDir>/worktrees/ directory.
 * The main worktree is not listed there, so add 1.
 */
export async function getWorktreeCountFromFs(): Promise<number> {
  try {
    const gitDir = await resolveGitDir()
    if (!gitDir) {
      return 0
    }
    const commonDir = (await getCommonDir(gitDir)) ?? gitDir
    const entries = await readdir(join(commonDir, 'worktrees'))
    return entries.length + 1
  } catch {
    // No worktrees directory means only the main worktree
    return 1
  }
}
