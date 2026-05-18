/**
 * mTLS / custom CA configuration — adapted from CC's utils/mtls.ts
 *
 * Reads client certificate/key from environment variables for mTLS:
 *   QILING_CLIENT_CERT  (or CLAUDE_CODE_CLIENT_CERT for CC compatibility)
 *   QILING_CLIENT_KEY   (or CLAUDE_CODE_CLIENT_KEY for CC compatibility)
 *   QILING_CLIENT_PASSPHRASE
 *
 * Used by the Anthropic SDK's HTTP agent and WebSocket transport when
 * connecting to API endpoints that require client certificates.
 *
 * Also integrates getCACertificates() for custom CA bundle support.
 */

import { readFileSync } from 'node:fs'
import type { Agent as HttpsAgent } from 'node:https'
import type * as tls from 'node:tls'
import { getCACertificates } from './caCerts.js'
import { logForDebugging } from './log.js'

export type MTLSConfig = {
  cert?: string
  key?: string
  passphrase?: string
}

export type TLSConfig = MTLSConfig & {
  ca?: string | string[] | Buffer
}

let _mtlsConfig: MTLSConfig | undefined | null = null
let _mtlsAgent: HttpsAgent | undefined | null = null

function readFileOrLog(envVar: string, label: string): string | undefined {
  const path = process.env[envVar]
  if (!path) return undefined
  try {
    const content = readFileSync(path, 'utf8')
    logForDebugging(`mTLS: Loaded ${label} from ${envVar}`)
    return content
  } catch (error) {
    logForDebugging(`mTLS: Failed to load ${label} from ${envVar}: ${error}`, { level: 'error' })
    return undefined
  }
}

/**
 * Get mTLS configuration from environment variables.
 * Cached for the process lifetime. Call clearMTLSCache() to reset.
 */
export function getMTLSConfig(): MTLSConfig | undefined {
  if (_mtlsConfig !== null) return _mtlsConfig

  const cert = readFileOrLog('QILING_CLIENT_CERT', 'client certificate')
    ?? readFileOrLog('CLAUDE_CODE_CLIENT_CERT', 'client certificate')
  const key = readFileOrLog('QILING_CLIENT_KEY', 'client key')
    ?? readFileOrLog('CLAUDE_CODE_CLIENT_KEY', 'client key')
  const passphrase = process.env.QILING_CLIENT_PASSPHRASE
    ?? process.env.CLAUDE_CODE_CLIENT_PASSPHRASE

  if (!cert && !key) {
    _mtlsConfig = undefined
    return undefined
  }

  _mtlsConfig = { cert, key, passphrase }
  return _mtlsConfig
}

/**
 * Get an HTTPS agent configured with mTLS and custom CA certs.
 * Cached for the process lifetime.
 */
export function getMTLSAgent(): HttpsAgent | undefined {
  if (_mtlsAgent !== null) return _mtlsAgent

  const mtlsConfig = getMTLSConfig()
  const caCerts = getCACertificates()

  if (!mtlsConfig && !caCerts) {
    _mtlsAgent = undefined
    return undefined
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const https = require('node:https') as typeof import('node:https')
  _mtlsAgent = new https.Agent({
    ...mtlsConfig,
    ...(caCerts && { ca: caCerts }),
  })

  logForDebugging('mTLS: Created HTTPS agent with custom certificates')
  return _mtlsAgent
}

/**
 * Get TLS options for WebSocket connections.
 */
export function getWebSocketTLSOptions(): tls.ConnectionOptions | undefined {
  const mtlsConfig = getMTLSConfig()
  const caCerts = getCACertificates()
  if (!mtlsConfig && !caCerts) return undefined
  return { ...mtlsConfig, ...(caCerts && { ca: caCerts }) }
}

/**
 * Get fetch options with TLS configuration for Bun or undici.
 */
export function getTLSFetchOptions(): {
  tls?: TLSConfig
  dispatcher?: unknown
} {
  const mtlsConfig = getMTLSConfig()
  const caCerts = getCACertificates()
  if (!mtlsConfig && !caCerts) return {}

  const tlsConfig: TLSConfig = { ...mtlsConfig, ...(caCerts && { ca: caCerts }) }

  if (typeof Bun !== 'undefined') {
    return { tls: tlsConfig }
  }

  // Node.js: use undici dispatcher (lazy-loaded to avoid bundle bloat)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const undiciMod = require('undici') as { Agent: new (opts: unknown) => unknown }
    const agent = new undiciMod.Agent({
      connect: {
        cert: tlsConfig.cert,
        key: tlsConfig.key,
        passphrase: tlsConfig.passphrase,
        ...(tlsConfig.ca && { ca: tlsConfig.ca }),
      },
      pipelining: 1,
    })
    logForDebugging('TLS: Created undici agent with custom certificates')
    return { dispatcher: agent }
  } catch {
    return {}
  }
}

/**
 * Clear the mTLS configuration cache.
 * Call after environment variable changes.
 */
export function clearMTLSCache(): void {
  _mtlsConfig = null
  _mtlsAgent = null
  logForDebugging('Cleared mTLS configuration cache')
}
