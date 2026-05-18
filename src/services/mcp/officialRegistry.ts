/**
 * Official MCP server registry — adapted from CC's services/mcp/officialRegistry.ts
 *
 * Fetches the Anthropic official MCP registry and caches URLs for lookup.
 * Used to distinguish official vs. third-party MCP servers for UI display.
 *
 * prefetchOfficialMcpUrls(): fire-and-forget fetch at startup
 * isOfficialMcpUrl(url): check if a URL is in the registry
 */

import { logForDebugging } from '../../utils/log.js'
import { errorMessage } from '../../utils/errors.js'

type RegistryServer = { server: { remotes?: Array<{ url: string }> } }
type RegistryResponse = { servers: RegistryServer[] }

let officialUrls: Set<string> | undefined

function normalizeUrl(url: string): string | undefined {
  try {
    const u = new URL(url)
    u.search = ''
    return u.toString().replace(/\/$/, '')
  } catch {
    return undefined
  }
}

/**
 * Fire-and-forget fetch of the official MCP registry.
 * Populates officialUrls for isOfficialMcpUrl() lookups.
 * Skipped in offline mode.
 */
export async function prefetchOfficialMcpUrls(): Promise<void> {
  if (
    process.env.QILING_OFFLINE ||
    process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC ||
    process.env.NO_COLOR
  ) {
    return
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)
    const response = await fetch(
      'https://api.anthropic.com/mcp-registry/v0/servers?version=latest&visibility=commercial',
      { signal: controller.signal },
    )
    clearTimeout(timer)

    if (!response.ok) return

    const data = await response.json() as RegistryResponse
    const urls = new Set<string>()
    for (const entry of data.servers) {
      for (const remote of entry.server.remotes ?? []) {
        const normalized = normalizeUrl(remote.url)
        if (normalized) urls.add(normalized)
      }
    }
    officialUrls = urls
    logForDebugging(`[mcp-registry] Loaded ${urls.size} official MCP URLs`)
  } catch (error) {
    logForDebugging(`Failed to fetch MCP registry: ${errorMessage(error)}`, { level: 'error' })
  }
}

/**
 * Returns true iff the given URL (normalized) is in the official MCP registry.
 * Returns false if the registry hasn't been fetched yet (fail-closed).
 */
export function isOfficialMcpUrl(normalizedUrl: string): boolean {
  return officialUrls?.has(normalizedUrl) ?? false
}

/** @internal — for tests */
export function resetOfficialMcpUrlsForTesting(): void {
  officialUrls = undefined
}
