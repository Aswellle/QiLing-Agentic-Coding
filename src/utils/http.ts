/**
 * HTTP utilities — adapted from CC's utils/http.ts
 *
 * Provides User-Agent strings and auth headers for API/MCP/WebFetch requests.
 * CC version: depends on OAuth token management and analytics.
 * QiLing version: uses API key auth, no OAuth.
 */

// ─── Version info ─────────────────────────────────────────────────────────────

let _appVersion: string | null = null

function getAppVersion(): string {
  if (_appVersion) return _appVersion
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../package.json') as { version: string }
    _appVersion = pkg.version
  } catch {
    _appVersion = '0.0.0'
  }
  return _appVersion
}

// ─── User-Agent strings ───────────────────────────────────────────────────────

/**
 * Main CLI User-Agent for Anthropic API calls.
 * Mirrors CC's getUserAgent() format for server-side log compatibility.
 */
export function getUserAgent(): string {
  const version = getAppVersion()
  const platform = process.platform
  const entrypoint = process.env.QILING_ENTRYPOINT ?? 'cli'

  const sdkVersion = process.env.CLAUDE_AGENT_SDK_VERSION
    ? `, agent-sdk/${process.env.CLAUDE_AGENT_SDK_VERSION}` : ''
  const clientApp = process.env.CLAUDE_AGENT_SDK_CLIENT_APP
    ? `, client-app/${process.env.CLAUDE_AGENT_SDK_CLIENT_APP}` : ''

  return `qiling/${version} (${platform}, ${entrypoint}${sdkVersion}${clientApp})`
}

/**
 * User-Agent for MCP client connections.
 * Shorter format suitable for MCP server logs.
 */
export function getMCPUserAgent(): string {
  const version = getAppVersion()
  const parts: string[] = []
  if (process.env.QILING_ENTRYPOINT) parts.push(process.env.QILING_ENTRYPOINT)
  if (process.env.CLAUDE_AGENT_SDK_VERSION) parts.push(`agent-sdk/${process.env.CLAUDE_AGENT_SDK_VERSION}`)
  const suffix = parts.length > 0 ? ` (${parts.join(', ')})` : ''
  return `qiling/${version}${suffix}`
}

/**
 * User-Agent for WebFetch requests to arbitrary sites.
 * Uses the 'Claude-User' brand for robots.txt compatibility.
 */
export function getWebFetchUserAgent(): string {
  return `Claude-User (${getUserAgent()}; +https://support.anthropic.com/)`
}

// ─── Auth headers ─────────────────────────────────────────────────────────────

export type AuthHeaders = {
  headers: Record<string, string>
}

/**
 * Get authentication headers for Anthropic API calls.
 * Prefers API key from env/settings, falls back to empty.
 */
export function getAuthHeaders(): AuthHeaders {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return { headers: {} }
  }

  return {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'User-Agent': getUserAgent(),
    },
  }
}

/**
 * Build fetch init with auth headers and user agent.
 */
export function buildAuthenticatedFetchInit(
  init: RequestInit = {},
): RequestInit {
  const { headers: authHeaders } = getAuthHeaders()
  const existingHeaders = new Headers(init.headers)

  for (const [key, value] of Object.entries(authHeaders)) {
    if (!existingHeaders.has(key)) {
      existingHeaders.set(key, value)
    }
  }

  return { ...init, headers: existingHeaders }
}
