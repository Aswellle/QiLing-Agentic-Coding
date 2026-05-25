/**
 * HTTP/HTTPS proxy support — adapted from CC's utils/proxy.ts (core subset)
 *
 * Reads HTTPS_PROXY / HTTP_PROXY / NO_PROXY from the environment and
 * configures the appropriate agent or fetch options. Used by the Anthropic
 * SDK HTTP client and WebSocket transport.
 *
 * CC's full proxy.ts also handles AWS credential-provider, undici dispatchers,
 * and axios instances. QiLing adapts the core subset that works without
 * external package dependencies.
 *
 * Full proxy support (HttpsProxyAgent) requires installing:
 *   bun add https-proxy-agent
 */

import type { LookupOptions } from 'node:dns'
import { logForDebugging } from './log.js'

// FROM CC: EnvLike allows injecting env in tests
type EnvLike = Record<string, string | undefined>

// FROM CC: convert dns.LookupOptions.family to numeric address family
export function getAddressFamily(options: LookupOptions): 0 | 4 | 6 {
  switch (options.family) {
    case 0: case 4: case 6: return options.family
    case 'IPv6': return 6
    case 'IPv4': case undefined: return 4
    default: throw new Error(`Unsupported address family: ${options.family}`)
  }
}

// FROM CC: get NO_PROXY env (lowercase preferred over uppercase)
export function getNoProxy(env: EnvLike = process.env): string | undefined {
  return env.no_proxy || env.NO_PROXY
}

// FROM CC: shouldBypassProxy — supports port-specific and comma+space splitting
export function shouldBypassProxy(
  urlString: string,
  noProxy: string | undefined = getNoProxy(),
): boolean {
  if (!noProxy) return false
  if (noProxy === '*') return true

  try {
    const url = new URL(urlString)
    const hostname = url.hostname.toLowerCase()
    const port = url.port || (url.protocol === 'https:' ? '443' : '80')
    const hostWithPort = `${hostname}:${port}`

    const noProxyList = noProxy.split(/[,\s]+/).filter(Boolean)
    return noProxyList.some(pattern => {
      pattern = pattern.toLowerCase().trim()
      if (pattern.includes(':')) return hostWithPort === pattern
      if (pattern.startsWith('.')) {
        const suffix = pattern
        return hostname === pattern.substring(1) || hostname.endsWith(suffix)
      }
      return hostname === pattern
    })
  } catch {
    return false
  }
}

let keepAliveDisabled = false

export function disableKeepAlive(): void {
  keepAliveDisabled = true
}

export function _resetKeepAliveForTesting(): void {
  keepAliveDisabled = false
}

/**
 * Get the effective proxy URL from environment variables.
 * Respects NO_PROXY to bypass the proxy for specific hosts.
 *
 * @param targetUrl  The URL being requested (for NO_PROXY matching)
 */
export function getProxyUrl(targetUrl?: string): string | undefined {
  const proxyUrl = process.env.HTTPS_PROXY
    ?? process.env.https_proxy
    ?? process.env.HTTP_PROXY
    ?? process.env.http_proxy

  if (!proxyUrl) return undefined

  // Check NO_PROXY / no_proxy
  const noProxy = process.env.NO_PROXY ?? process.env.no_proxy
  if (noProxy && targetUrl) {
    const noProxyList = noProxy.split(',').map(h => h.trim().toLowerCase())
    try {
      const hostname = new URL(targetUrl).hostname.toLowerCase()
      if (noProxyList.some(entry => {
        if (entry === '*') return true
        if (entry.startsWith('.')) return hostname.endsWith(entry)
        return hostname === entry || hostname.endsWith('.' + entry)
      })) {
        return undefined
      }
    } catch { /* invalid URL, ignore NO_PROXY check */ }
  }

  return proxyUrl
}

/**
 * Get an HTTPS agent configured for the current proxy settings.
 * Lazy-loads https-proxy-agent to avoid adding ~50KB to the bundle
 * when no proxy is configured (the common case).
 *
 * Returns undefined when no proxy is configured or https-proxy-agent
 * is not installed (proxy access still works via NODE_EXTRA_CA_CERTS
 * and Bun/Node's built-in proxy auto-detection from env vars).
 */
export function getProxyAgent(targetUrl?: string): unknown | undefined {
  const proxyUrl = getProxyUrl(targetUrl)
  if (!proxyUrl) return undefined

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { HttpsProxyAgent } = require('https-proxy-agent') as {
      HttpsProxyAgent: new (url: string) => unknown
    }
    logForDebugging(`Proxy: Using ${proxyUrl} for ${targetUrl ?? 'all requests'}`)
    return new HttpsProxyAgent(proxyUrl)
  } catch {
    // https-proxy-agent not installed — log hint
    if (proxyUrl) {
      logForDebugging(
        `Proxy: HTTPS_PROXY is set but https-proxy-agent is not installed. ` +
        `Run: bun add https-proxy-agent`,
      )
    }
    return undefined
  }
}

/**
 * Get fetch init options for proxy + keep-alive configuration.
 * Use this when calling fetch() directly with the Anthropic API.
 */
export function getProxyFetchInit(targetUrl?: string): RequestInit {
  const init: RequestInit & { keepalive?: boolean } = {}

  if (keepAliveDisabled) {
    init.keepalive = false
  }

  return init
}

/**
 * Check whether an HTTPS proxy is configured in the environment.
 */
export function isProxyConfigured(): boolean {
  return !!(
    process.env.HTTPS_PROXY ??
    process.env.https_proxy ??
    process.env.HTTP_PROXY ??
    process.env.http_proxy
  )
}
