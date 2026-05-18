/**
 * Release notes / changelog utilities — adapted from CC's utils/releaseNotes.ts
 *
 * Flow (same as CC):
 * 1. On update, fetch CHANGELOG.md from GitHub in the background
 * 2. Cache at ~/.qiling/cache/changelog.md
 * 3. Next startup reads cache; shows new entries since last seen version
 *
 * Uses fetch() instead of axios (Bun has native fetch).
 * Adapted for QiLing's GitHub repo and settings layer.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { getGlobalConfigDir } from '../settings/loader.js'
import { toError } from './errors.js'
import { logError } from './log.js'
import { gt } from './semver.js'

// ─── Constants ────────────────────────────────────────────────────────────────

export const CHANGELOG_URL =
  'https://github.com/Aswellle/QiLing-Agentic-Coding/blob/main/CHANGELOG.md'

const RAW_CHANGELOG_URL =
  'https://raw.githubusercontent.com/Aswellle/QiLing-Agentic-Coding/refs/heads/main/CHANGELOG.md'

const MAX_RELEASE_NOTES_SHOWN = 5
const FETCH_TIMEOUT_MS = 10_000

// ─── Cache path ───────────────────────────────────────────────────────────────

function getChangelogCachePath(): string {
  return join(getGlobalConfigDir(), 'cache', 'changelog.md')
}

// In-memory cache; populated by the first async read. React render paths
// read from this after setup awaits checkForReleaseNotes().
let changelogMemoryCache: string | null = null

/** @internal — for tests only */
export function _resetChangelogCacheForTesting(): void {
  changelogMemoryCache = null
}

// ─── Fetch & store ────────────────────────────────────────────────────────────

/**
 * Fetch the latest CHANGELOG.md from GitHub and persist it.
 * Runs in the background — does NOT block startup.
 */
export async function fetchAndStoreChangelog(): Promise<void> {
  // Skip in non-interactive / CI environments
  if (process.env.CI || process.env.NO_COLOR || process.env.QILING_NONINTERACTIVE) return
  // Skip when offline mode is requested
  if (process.env.QILING_OFFLINE) return

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(RAW_CHANGELOG_URL, { signal: controller.signal })
    clearTimeout(timer)

    if (!res.ok) return

    const content = await res.text()
    if (!content || content === changelogMemoryCache) return

    const cachePath = getChangelogCachePath()
    await mkdir(dirname(cachePath), { recursive: true })
    await writeFile(cachePath, content, { encoding: 'utf-8' })
    changelogMemoryCache = content
  } catch {
    // Silently ignore network errors (offline, timeout, etc.)
  }
}

/**
 * Get the stored changelog from disk, populating the in-memory cache.
 */
export async function getStoredChangelog(): Promise<string> {
  if (changelogMemoryCache !== null) return changelogMemoryCache
  try {
    const content = await readFile(getChangelogCachePath(), 'utf-8')
    changelogMemoryCache = content
    return content
  } catch {
    changelogMemoryCache = ''
    return ''
  }
}

/** Synchronous accessor — reads only the in-memory cache. */
export function getStoredChangelogFromMemory(): string {
  return changelogMemoryCache ?? ''
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Parse a markdown changelog into { version → notes[] } map.
 * Handles "## 1.2.3" and "## 1.2.3 - 2024-01-15" heading formats.
 */
export function parseChangelog(content: string): Record<string, string[]> {
  try {
    if (!content) return {}
    const releaseNotes: Record<string, string[]> = {}
    const sections = content.split(/^## /gm).slice(1)

    for (const section of sections) {
      const lines = section.trim().split('\n')
      const versionLine = lines[0]
      if (!versionLine) continue
      const version = versionLine.split(' - ')[0]?.trim()
      if (!version) continue

      const notes = lines
        .slice(1)
        .filter(l => l.trim().startsWith('- '))
        .map(l => l.trim().slice(2).trim())
        .filter(Boolean)

      if (notes.length > 0) releaseNotes[version] = notes
    }

    return releaseNotes
  } catch (error) {
    logError(toError(error))
    return {}
  }
}

// ─── Filtering ────────────────────────────────────────────────────────────────

function coerceSemver(v: string): string {
  // Strip leading 'v' and any build suffix (SHA, etc.)
  return v.replace(/^v/, '').split('-')[0] ?? v
}

/**
 * Get release notes for versions newer than `previousVersion` (up to MAX_RELEASE_NOTES_SHOWN).
 */
export function getRecentReleaseNotes(
  currentVersion: string,
  previousVersion: string | null | undefined,
  changelogContent = getStoredChangelogFromMemory(),
): string[] {
  try {
    const releaseNotes = parseChangelog(changelogContent)
    const prev = previousVersion ? coerceSemver(previousVersion) : null
    const curr = coerceSemver(currentVersion)

    if (!prev || gt(curr, prev)) {
      return Object.entries(releaseNotes)
        .filter(([version]) => !prev || gt(version, prev))
        .sort(([a], [b]) => (gt(a, b) ? -1 : 1))
        .flatMap(([, notes]) => notes)
        .filter(Boolean)
        .slice(0, MAX_RELEASE_NOTES_SHOWN)
    }
  } catch (error) {
    logError(toError(error))
  }
  return []
}

/**
 * Get all release notes as [version, notes[]] sorted oldest → newest.
 */
export function getAllReleaseNotes(
  changelogContent = getStoredChangelogFromMemory(),
): Array<[string, string[]]> {
  try {
    const releaseNotes = parseChangelog(changelogContent)
    return Object.keys(releaseNotes)
      .sort((a, b) => (gt(a, b) ? 1 : -1))
      .map((v): [string, string[]] | null => {
        const notes = (releaseNotes[v] ?? []).filter(Boolean)
        return notes.length > 0 ? [v, notes] : null
      })
      .filter((x): x is [string, string[]] => x !== null)
  } catch (error) {
    logError(toError(error))
    return []
  }
}

// ─── Main API ─────────────────────────────────────────────────────────────────

/** Get the current version from package.json. */
function getCurrentVersion(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('../../package.json') as { version: string }).version
  } catch {
    return '0.0.0'
  }
}

/**
 * Async version: populates the in-memory cache then returns release notes.
 * Also triggers a background fetch when version has changed.
 *
 * @param lastSeenVersion  Last version the user saw release notes for
 * @param currentVersion   Defaults to package.json version
 */
export async function checkForReleaseNotes(
  lastSeenVersion: string | null | undefined,
  currentVersion = getCurrentVersion(),
): Promise<{ hasReleaseNotes: boolean; releaseNotes: string[] }> {
  const cachedChangelog = await getStoredChangelog()

  if (lastSeenVersion !== currentVersion || !cachedChangelog) {
    fetchAndStoreChangelog().catch(err => logError(toError(err)))
  }

  const releaseNotes = getRecentReleaseNotes(currentVersion, lastSeenVersion, cachedChangelog)
  return { hasReleaseNotes: releaseNotes.length > 0, releaseNotes }
}

/**
 * Sync variant for React render paths. Only reads the in-memory cache.
 * Call `await checkForReleaseNotes()` at startup to warm the cache first.
 */
export function checkForReleaseNotesSync(
  lastSeenVersion: string | null | undefined,
  currentVersion = getCurrentVersion(),
): { hasReleaseNotes: boolean; releaseNotes: string[] } {
  const releaseNotes = getRecentReleaseNotes(currentVersion, lastSeenVersion)
  return { hasReleaseNotes: releaseNotes.length > 0, releaseNotes }
}
