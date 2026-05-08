/**
 * Windows/POSIX path conversion utilities — ported from CC's utils/windowsPaths.ts
 * Handles UNC paths, drive letters, MSYS2/Git Bash paths, Cygwin paths.
 */

const winToPosixCache = new Map<string, string>()
const posixToWinCache = new Map<string, string>()
const MAX_CACHE = 500

function cacheGet(cache: Map<string, string>, key: string): string | undefined {
  return cache.get(key)
}
function cacheSet(cache: Map<string, string>, key: string, value: string): void {
  if (cache.size >= MAX_CACHE) cache.clear()
  cache.set(key, value)
}

/** Convert a Windows path to POSIX. C:\Users\foo → /c/Users/foo */
export function windowsPathToPosixPath(windowsPath: string): string {
  const cached = cacheGet(winToPosixCache, windowsPath)
  if (cached) return cached
  let result: string
  if (windowsPath.startsWith('\\\\')) {
    result = windowsPath.replace(/\\/g, '/')
  } else {
    const match = windowsPath.match(/^([A-Za-z]):[/\\]/)
    if (match) {
      const d = match[1]!.toLowerCase()
      result = '/' + d + windowsPath.slice(2).replace(/\\/g, '/')
    } else {
      result = windowsPath.replace(/\\/g, '/')
    }
  }
  cacheSet(winToPosixCache, windowsPath, result)
  return result
}

/** Convert a POSIX path to Windows. /c/Users/foo → C:\Users\foo */
export function posixPathToWindowsPath(posixPath: string): string {
  const cached = cacheGet(posixToWinCache, posixPath)
  if (cached) return cached
  let result: string
  if (posixPath.startsWith('//')) {
    result = posixPath.replace(/\//g, '\\')
  } else {
    const cygdrive = posixPath.match(/^\/cygdrive\/([A-Za-z])(\/|$)/)
    if (cygdrive) {
      const d = cygdrive[1]!.toUpperCase()
      const rest = posixPath.slice(('/cygdrive/' + cygdrive[1]).length)
      result = d + ':' + (rest || '\\').replace(/\//g, '\\')
    } else {
      const drive = posixPath.match(/^\/([A-Za-z])(\/|$)/)
      if (drive) {
        const d = drive[1]!.toUpperCase()
        const rest = posixPath.slice(2)
        result = d + ':' + (rest || '\\').replace(/\//g, '\\')
      } else {
        result = posixPath.replace(/\//g, '\\')
      }
    }
  }
  cacheSet(posixToWinCache, posixPath, result)
  return result
}
