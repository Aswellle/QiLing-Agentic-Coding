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

// ─── Download & apply ─────────────────────────────────────────────────────────

function getPlatformAssetName(): string {
  const os = process.platform
  const arch = process.arch
  if (os === 'linux'  && arch === 'x64')   return 'qiling-linux-x64'
  if (os === 'linux'  && arch === 'arm64') return 'qiling-linux-arm64'
  if (os === 'darwin' && arch === 'x64')   return 'qiling-macos-x64'
  if (os === 'darwin' && arch === 'arm64') return 'qiling-macos-arm64'
  if (os === 'win32')                       return 'qiling-windows-x64.exe'
  return ''
}

async function getDownloadUrl(version: string): Promise<string | null> {
  const asset = getPlatformAssetName()
  if (!asset) return null
  // Try to get the exact download URL from the release assets
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${version}`,
      { headers: { 'User-Agent': 'qiling-updater', Accept: 'application/vnd.github+json' },
        signal: AbortSignal.timeout(5_000) }
    )
    if (!res.ok) {
      // Fallback to predictable URL pattern
      return `https://github.com/${GITHUB_REPO}/releases/download/${version}/${asset}`
    }
    const data = await res.json() as { assets?: Array<{ name: string; browser_download_url: string }> }
    const found = data.assets?.find(a => a.name === asset)
    return found?.browser_download_url
      ?? `https://github.com/${GITHUB_REPO}/releases/download/${version}/${asset}`
  } catch {
    return `https://github.com/${GITHUB_REPO}/releases/download/${version}/${asset}`
  }
}

/**
 * Download the latest version and replace the current binary.
 * onProgress is called with status messages.
 * Returns true on success.
 */
export async function downloadAndApplyUpdate(
  info: UpdateInfo,
  onProgress: (msg: string) => void
): Promise<boolean> {
  const url = await getDownloadUrl(info.latestVersion)
  if (!url) {
    onProgress('⚠ 无法确定下载地址（当前平台可能不支持自动更新）')
    onProgress(`请手动下载: ${info.releaseUrl}`)
    return false
  }

  onProgress(`正在下载 QiLing ${info.latestVersion}…`)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'qiling-updater' },
      signal: AbortSignal.timeout(120_000),
    })
    if (!res.ok) {
      onProgress(`✗ 下载失败: HTTP ${res.status}`)
      return false
    }

    const buf = await res.arrayBuffer()
    const { tmpdir } = await import('os')
    const { join: pathJoin } = await import('path')
    const { writeFileSync, copyFileSync, renameSync, chmodSync } = await import('fs')

    const tmpPath = pathJoin(tmpdir(), `qiling-update-${Date.now()}`)
    writeFileSync(tmpPath, new Uint8Array(buf))

    if (process.platform !== 'win32') chmodSync(tmpPath, 0o755)

    // Verify the new binary runs
    const test = Bun.spawn([tmpPath, '--version'], { stdout: 'pipe', stderr: 'pipe' })
    const code = await test.exited
    if (code !== 0) {
      onProgress('✗ 验证新版本失败，更新已中止（文件可能损坏）')
      return false
    }

    const currentBin = process.execPath
    onProgress('正在替换二进制文件…')

    if (process.platform === 'win32') {
      // Windows: can't replace running exe; place next to current
      const newPath = currentBin.replace(/\.exe$/i, `-v${info.latestVersion}.exe`)
      renameSync(tmpPath, newPath)
      onProgress(`✓ 已下载到: ${newPath}`)
      onProgress('请关闭当前会话并手动将新文件重命名替换旧文件。')
      return true
    }

    copyFileSync(currentBin, `${currentBin}.backup`)
    renameSync(tmpPath, currentBin)

    onProgress(`✓ 已从 v${info.currentVersion} 升级到 v${info.latestVersion}`)
    onProgress('请重启 QiLing 以使用新版本。备份: ' + currentBin + '.backup')
    return true
  } catch (err) {
    onProgress(`✗ 更新失败: ${err instanceof Error ? err.message : String(err)}`)
    return false
  }
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
