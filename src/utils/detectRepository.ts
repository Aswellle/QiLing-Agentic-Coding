/**
 * Repository detection utilities — ported from CC's utils/detectRepository.ts
 *
 * Detects the current git repository and parses remote URLs to extract
 * host/owner/repo components. Used by /doctor, /review, and /pr commands.
 */

import { getRemoteUrl, normalizeGitRemoteUrl } from './git'

export type ParsedRepository = {
  host: string
  owner: string
  name: string
}

const _cache = new Map<string, ParsedRepository | null>()

export function clearRepositoryCaches(): void {
  _cache.clear()
}

/**
 * Parse a git remote URL into { host, owner, name }.
 * Returns null if the URL cannot be parsed.
 *
 * Supports:
 *   git@github.com:owner/repo.git
 *   https://github.com/owner/repo.git
 *   https://github.com/owner/repo
 *   ssh://git@github.com/owner/repo
 */
export function parseGitRemote(url: string): ParsedRepository | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  // SSH: git@host:owner/repo.git
  const sshMatch = trimmed.match(/^git@([^:]+):([^/]+)\/(.+?)(?:\.git)?$/)
  if (sshMatch?.[1] && sshMatch[2] && sshMatch[3]) {
    return {
      host: sshMatch[1].toLowerCase(),
      owner: sshMatch[2],
      name: sshMatch[3],
    }
  }

  // HTTP(S) or SSH URL
  try {
    const u = new URL(trimmed)
    const parts = u.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/')
    if (parts.length >= 2) {
      return {
        host: u.hostname.toLowerCase(),
        owner: parts[0]!,
        name: parts.slice(1).join('/'),
      }
    }
  } catch { /* not a valid URL */ }

  return null
}

/**
 * Detect the current repository as "owner/repo" (GitHub only).
 * Returns null if not in a git repo or not a github.com remote.
 */
export async function detectCurrentRepository(cwd = process.cwd()): Promise<string | null> {
  const result = await detectCurrentRepositoryWithHost(cwd)
  if (!result || result.host !== 'github.com') return null
  return `${result.owner}/${result.name}`
}

/**
 * Detect the current repository with host information.
 * Useful for GitHub Enterprise support.
 */
export async function detectCurrentRepositoryWithHost(
  cwd = process.cwd(),
): Promise<ParsedRepository | null> {
  if (_cache.has(cwd)) return _cache.get(cwd) ?? null

  try {
    const remoteUrl = await getRemoteUrl(cwd)
    if (!remoteUrl) { _cache.set(cwd, null); return null }

    const parsed = parseGitRemote(remoteUrl)
    _cache.set(cwd, parsed)
    return parsed
  } catch {
    _cache.set(cwd, null)
    return null
  }
}

/**
 * Check if the current directory is a GitHub repository.
 */
export async function isGitHubRepository(cwd = process.cwd()): Promise<boolean> {
  const repo = await detectCurrentRepository(cwd)
  return repo !== null
}
