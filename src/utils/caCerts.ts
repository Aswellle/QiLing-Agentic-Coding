/**
 * CA certificate loading for TLS connections — adapted from CC's utils/caCerts.ts
 *
 * Since setting `ca` on an HTTPS agent REPLACES the default certificate store,
 * we must always include base CAs (system or bundled Mozilla) when returning custom ones.
 *
 * Returns undefined when no custom CA config is needed (runtime handles TLS natively).
 *
 * Behavior:
 * - Neither NODE_EXTRA_CA_CERTS nor --use-system-ca set → undefined (runtime defaults)
 * - NODE_EXTRA_CA_CERTS only → bundled Mozilla CAs + extra cert file
 * - --use-system-ca only → system CAs
 * - --use-system-ca + NODE_EXTRA_CA_CERTS → system CAs + extra cert file
 *
 * Memoized for performance. Call clearCACertsCache() after NODE_EXTRA_CA_CERTS changes.
 */

import { readFileSync } from 'node:fs'
import { logForDebugging } from './log.js'

function hasNodeOption(flag: string): boolean {
  const nodeOptions = process.env.NODE_OPTIONS
  if (!nodeOptions) return false
  return nodeOptions.split(/\s+/).includes(flag)
}

let _cache: string[] | undefined | null = null  // null = not computed yet

export function getCACertificates(): string[] | undefined {
  if (_cache !== null) return _cache

  const useSystemCA = hasNodeOption('--use-system-ca') || hasNodeOption('--use-openssl-ca')
  const extraCertsPath = process.env.NODE_EXTRA_CA_CERTS

  logForDebugging(`CA certs: useSystemCA=${useSystemCA}, extraCertsPath=${extraCertsPath}`)

  if (!useSystemCA && !extraCertsPath) {
    _cache = undefined
    return undefined
  }

  // Deferred require: tls module materializes ~150 Mozilla root certs on import
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const tls = require('tls') as typeof import('tls')

  const certs: string[] = []

  if (useSystemCA) {
    type TlsWithSystem = typeof tls & { getCACertificates?: (type: string) => string[] }
    const getCACerts = (tls as TlsWithSystem).getCACertificates
    const systemCAs = getCACerts?.('system')
    if (systemCAs && systemCAs.length > 0) {
      certs.push(...systemCAs)
      logForDebugging(`CA certs: Loaded ${certs.length} system CA certs (--use-system-ca)`)
    } else if (!getCACerts && !extraCertsPath) {
      // Node.js: no system CA API, no extra certs — defer to runtime
      logForDebugging('CA certs: --use-system-ca set but system CA API unavailable, deferring to runtime')
      _cache = undefined
      return undefined
    } else {
      // System CA API returned empty — fall back to bundled root certs
      certs.push(...tls.rootCertificates)
      logForDebugging(`CA certs: Loaded ${certs.length} bundled root certs as base (--use-system-ca fallback)`)
    }
  } else {
    // Must include bundled Mozilla CAs as base since `ca` replaces defaults
    certs.push(...tls.rootCertificates)
    logForDebugging(`CA certs: Loaded ${certs.length} bundled root certs as base`)
  }

  if (extraCertsPath) {
    try {
      const extraCert = readFileSync(extraCertsPath, 'utf8')
      certs.push(extraCert)
      logForDebugging(`CA certs: Appended extra certs from NODE_EXTRA_CA_CERTS (${extraCertsPath})`)
    } catch (error) {
      logForDebugging(
        `CA certs: Failed to read NODE_EXTRA_CA_CERTS (${extraCertsPath}): ${error}`,
        { level: 'error' },
      )
    }
  }

  _cache = certs.length > 0 ? certs : undefined
  return _cache
}

export function clearCACertsCache(): void {
  _cache = null
  logForDebugging('Cleared CA certificates cache')
}
