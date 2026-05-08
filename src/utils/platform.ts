/**
 * Platform detection utility — ported from CC's utils/platform.ts
 *
 * Returns: 'macos' | 'windows' | 'wsl' | 'linux' | 'unknown'
 * WSL is detected via /proc/version containing 'microsoft' or 'wsl'.
 */

import { readFileSync } from 'fs'

export type Platform = 'macos' | 'windows' | 'wsl' | 'linux' | 'unknown'

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
