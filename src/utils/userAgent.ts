/**
 * User-Agent string helpers — adapted from CC's utils/userAgent.ts
 *
 * Dependency-free so SDK-bundled code can import without pulling in auth.ts.
 */

let _version: string | null = null

function getVersion(): string {
  if (_version) return _version
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _version = (require('../../package.json') as { version: string }).version
  } catch { _version = '0.0.0' }
  return _version
}

/**
 * Get the QiLing CLI user agent string.
 * Format matches CC's claude-code/ prefix for API compatibility.
 */
export function getQilingUserAgent(): string {
  return `qiling/${getVersion()}`
}

/** Alias matching CC's getClaudeCodeUserAgent() function name */
export const getClaudeCodeUserAgent = getQilingUserAgent
