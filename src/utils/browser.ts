/**
 * Browser and path opening utilities — direct port of CC's utils/browser.ts
 *
 * openBrowser(url): open a URL in the default browser
 * openPath(path): open a file/folder with the system's default handler
 *
 * Security: openBrowser validates URL protocol (only http/https allowed).
 * Respects BROWSER env var for browser override.
 */

import { execFileNoThrow } from './execFileNoThrow.js'

function validateUrl(url: string): void {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error(`Invalid URL format: ${url}`)
  }
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error(
      `Invalid URL protocol: must use http:// or https://, got ${parsedUrl.protocol}`,
    )
  }
}

/**
 * Open a file or folder path using the system's default handler.
 * Uses `open` on macOS, `explorer` on Windows, `xdg-open` on Linux.
 */
export async function openPath(path: string): Promise<boolean> {
  try {
    if (process.platform === 'win32') {
      const { code } = await execFileNoThrow('explorer', [path])
      return code === 0
    }
    const command = process.platform === 'darwin' ? 'open' : 'xdg-open'
    const { code } = await execFileNoThrow(command, [path])
    return code === 0
  } catch {
    return false
  }
}

/**
 * Open a URL in the default browser.
 * Validates that the URL uses http/https before opening.
 * Respects the BROWSER environment variable for browser override.
 */
export async function openBrowser(url: string): Promise<boolean> {
  try {
    validateUrl(url)

    const browserEnv = process.env.BROWSER

    if (process.platform === 'win32') {
      if (browserEnv) {
        const { code } = await execFileNoThrow(browserEnv, [`"${url}"`])
        return code === 0
      }
      const { code } = await execFileNoThrow('rundll32', ['url,OpenURL', url])
      return code === 0
    }

    const command = browserEnv ?? (process.platform === 'darwin' ? 'open' : 'xdg-open')
    const { code } = await execFileNoThrow(command, [url])
    return code === 0
  } catch {
    return false
  }
}
