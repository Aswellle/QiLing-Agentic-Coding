/**
 * 启动时检查新版本（非阻塞，后台运行）
 * - 检查结果缓存 24 小时（避免每次启动都发请求）
 * - 网络失败静默忽略
 * - --no-update-check 标志禁用
 */
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { getGlobalConfigDir } from '../settings/loader'

const GITHUB_REPO = 'Aswellle/QiLing-Agentic-Coding'
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000  // 24 hours
const REQUEST_TIMEOUT_MS = 3_000

interface UpdateCache {
  checkedAt: number
  latestVersion: string
  releaseUrl: string
}

function getCachePath(): string {
  return join(getGlobalConfigDir(), '.update-cache.json')
}

function readCache(): UpdateCache | null {
  try {
    const p = getCachePath()
    if (!existsSync(p)) return null
    const raw = readFileSync(p, 'utf-8')
    const data = JSON.parse(raw) as UpdateCache
    if (typeof data.checkedAt !== 'number') return null
    return data
  } catch {
    return null
  }
}

function writeCache(data: UpdateCache): void {
  try {
    mkdirSync(getGlobalConfigDir(), { recursive: true })
    writeFileSync(getCachePath(), JSON.stringify(data, null, 2), 'utf-8')
  } catch {
    // non-fatal
  }
}

function compareVersions(a: string, b: string): number {
  const parse = (v: string) => v.replace(/^v/, '').split('-')[0].split('.').map(Number)
  const pa = parse(a)
  const pb = parse(b)
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

async function fetchLatestVersion(): Promise<UpdateCache | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: { 'User-Agent': 'qiling-updater', Accept: 'application/vnd.github+json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }
    )
    if (!response.ok) return null

    const data = await response.json() as { tag_name?: string; html_url?: string }
    if (!data.tag_name) return null

    return {
      checkedAt: Date.now(),
      latestVersion: data.tag_name,
      releaseUrl: data.html_url ?? `https://github.com/${GITHUB_REPO}/releases/latest`,
    }
  } catch {
    return null
  }
}

export interface UpdateInfo {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  releaseUrl: string
}

/**
 * Check for updates in the background.
 * Returns update info if a newer version is available, null otherwise.
 * Respects 24h cache. All network errors are silently ignored.
 */
export async function checkForUpdates(
  currentVersion: string,
  options: { noUpdateCheck?: boolean } = {}
): Promise<UpdateInfo | null> {
  if (options.noUpdateCheck) return null
  if (process.env.QILING_NO_UPDATE_CHECK === '1') return null

  let cache = readCache()
  const now = Date.now()

  // Use cache if fresh (< 24 hours old)
  if (!cache || now - cache.checkedAt > CHECK_INTERVAL_MS) {
    cache = await fetchLatestVersion()
    if (cache) writeCache(cache)
  }

  if (!cache) return null

  // Compare versions
  const isNewer = compareVersions(cache.latestVersion, currentVersion) > 0
  if (!isNewer) return null

  return {
    hasUpdate: true,
    currentVersion,
    latestVersion: cache.latestVersion,
    releaseUrl: cache.releaseUrl,
  }
}
