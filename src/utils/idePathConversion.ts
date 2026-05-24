/**
 * IDE path conversion — adapted from CC's utils/idePathConversion.ts
 *
 * Handles path translation between different environments (WSL↔Windows).
 * Used for IDE integration when the IDE runs on Windows and CC runs in WSL.
 */

import { execFileSync } from 'child_process'

export interface IDEPathConverter {
  toLocalPath(idePath: string): string
  toIDEPath(localPath: string): string
}

export class WindowsToWSLConverter implements IDEPathConverter {
  constructor(private wslDistroName: string | undefined) {}

  toLocalPath(windowsPath: string): string {
    if (!windowsPath) return windowsPath
    if (this.wslDistroName) {
      const wslUncMatch = windowsPath.match(/^\\\\wsl(?:\.localhost|\$)\\([^\\]+)(.*)$/)
      if (wslUncMatch && wslUncMatch[1] !== this.wslDistroName) return windowsPath
    }
    try {
      return execFileSync('wslpath', ['-u', windowsPath], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim()
    } catch {
      return windowsPath.replace(/\\/g, '/').replace(/^([A-Z]):/i, (_, l) => `/mnt/${l.toLowerCase()}`)
    }
  }

  toIDEPath(wslPath: string): string {
    if (!wslPath) return wslPath
    try {
      return execFileSync('wslpath', ['-w', wslPath], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim()
    } catch {
      return wslPath
    }
  }
}

export function checkWSLDistroMatch(windowsPath: string, wslDistroName: string): boolean {
  const wslUncMatch = windowsPath.match(/^\\\\wsl(?:\.localhost|\$)\\([^\\]+)(.*)$/)
  return wslUncMatch ? wslUncMatch[1] === wslDistroName : true // FROM CC: non-WSL path → no distro mismatch
}

/** Identity converter — no-op for native Linux/macOS paths */
export class IdentityPathConverter implements IDEPathConverter {
  toLocalPath(path: string) { return path }
  toIDEPath(path: string) { return path }
}
