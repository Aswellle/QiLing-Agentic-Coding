/**
 * Platform detection utility — ported from CC's utils/platform.ts
 *
 * Returns: 'macos' | 'windows' | 'wsl' | 'linux' | 'unknown'
 * WSL is detected via /proc/version containing 'microsoft' or 'wsl'.
 */

import { readFileSync } from 'fs'
import { readFile, readdir } from 'node:fs/promises'
import { release as osRelease } from 'os'

export type Platform = 'macos' | 'windows' | 'wsl' | 'linux' | 'unknown'

// FROM CC: SUPPORTED_PLATFORMS — platforms with full interactive terminal support
export const SUPPORTED_PLATFORMS: Platform[] = ['macos', 'wsl']

let _cachedPlatform: Platform | null = null

export function getPlatform(): Platform {
  if (_cachedPlatform) return _cachedPlatform

  if (process.platform === 'darwin') {
    return (_cachedPlatform = 'macos')
  }
  if (process.platform === 'win32') {
    return (_cachedPlatform = 'windows')
  }
  if (process.platform === 'linux') {
    try {
      const procVersion = readFileSync('/proc/version', 'utf8')
      if (procVersion.toLowerCase().includes('microsoft') || procVersion.toLowerCase().includes('wsl')) {
        return (_cachedPlatform = 'wsl')
      }
    } catch { /* regular Linux */ }
    return (_cachedPlatform = 'linux')
  }
  return (_cachedPlatform = 'unknown')
}

export function isWSL(): boolean { return getPlatform() === 'wsl' }
export function isMacOS(): boolean { return getPlatform() === 'macos' }
export function isWindows(): boolean { return getPlatform() === 'windows' }
export function isLinux(): boolean { return getPlatform() === 'linux' || getPlatform() === 'wsl' }

// FROM CC: getWslVersion — returns WSL version string ('1', '2', etc.) or undefined
let _cachedWslVersion: string | undefined | null = null
export function getWslVersion(): string | undefined {
  if (_cachedWslVersion !== null) return _cachedWslVersion
  if (process.platform !== 'linux') return (_cachedWslVersion = undefined)
  try {
    const procVersion = readFileSync('/proc/version', 'utf8')
    const match = procVersion.match(/WSL(\d+)/i)
    if (match?.[1]) return (_cachedWslVersion = match[1])
    if (procVersion.toLowerCase().includes('microsoft')) return (_cachedWslVersion = '1')
    return (_cachedWslVersion = undefined)
  } catch {
    return (_cachedWslVersion = undefined)
  }
}

// FROM CC: LinuxDistroInfo + getLinuxDistroInfo — async distro metadata
export type LinuxDistroInfo = {
  linuxDistroId?: string
  linuxDistroVersion?: string
  linuxKernel?: string
}

let _cachedLinuxDistroInfo: LinuxDistroInfo | undefined | null = null
export async function getLinuxDistroInfo(): Promise<LinuxDistroInfo | undefined> {
  if (_cachedLinuxDistroInfo !== null) return _cachedLinuxDistroInfo
  if (process.platform !== 'linux') return (_cachedLinuxDistroInfo = undefined)
  const result: LinuxDistroInfo = { linuxKernel: osRelease() }
  try {
    const content = await readFile('/etc/os-release', 'utf8')
    for (const line of content.split('\n')) {
      const match = line.match(/^(ID|VERSION_ID)=(.*)$/)
      if (match?.[1] && match[2]) {
        const value = match[2].replace(/^"|"$/g, '')
        if (match[1] === 'ID') result.linuxDistroId = value
        else result.linuxDistroVersion = value
      }
    }
  } catch { /* /etc/os-release may not exist */ }
  return (_cachedLinuxDistroInfo = result)
}

// FROM CC: detectVcs — detect version control systems in directory
const VCS_MARKERS: Array<[string, string]> = [
  ['.git', 'git'], ['.hg', 'mercurial'], ['.svn', 'svn'],
  ['.p4config', 'perforce'], ['$tf', 'tfs'], ['.tfvc', 'tfs'],
  ['.jj', 'jujutsu'], ['.sl', 'sapling'],
]
export async function detectVcs(dir?: string): Promise<string[]> {
  const detected = new Set<string>()
  if (process.env.P4PORT) detected.add('perforce')
  try {
    const targetDir = dir ?? process.cwd()
    const entries = new Set(await readdir(targetDir))
    for (const [marker, vcs] of VCS_MARKERS) {
      if (entries.has(marker)) detected.add(vcs)
    }
  } catch { /* directory may not be readable */ }
  return [...detected]
}
