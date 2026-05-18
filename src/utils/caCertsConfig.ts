/**
 * Apply NODE_EXTRA_CA_CERTS from QiLing settings — adapted from CC's utils/caCertsConfig.ts
 *
 * Call `applyExtraCACertsFromConfig()` early in main.tsx (before any TLS
 * connections) to pick up a CA bundle configured in settings.json.
 *
 * Why: Bun may cache the TLS certificate store at boot time. Setting
 * NODE_EXTRA_CA_CERTS before any TLS connections gives the runtime the
 * best chance of picking up the custom CA.
 *
 * Safe to call before trust dialogs because it only reads global
 * (~/.qiling/settings.json) settings, not project-level settings.
 */

import { logForDebugging } from './log.js'

let _applied = false

/**
 * Apply NODE_EXTRA_CA_CERTS from settings.json to process.env.
 * No-op if already set in environment. Idempotent.
 *
 * @param extraCACerts  Path from settings.json extraCACerts field
 */
export function applyExtraCACertsFromConfig(extraCACerts?: string): void {
  if (_applied) return
  _applied = true

  if (process.env.NODE_EXTRA_CA_CERTS) {
    logForDebugging(`CA certs: NODE_EXTRA_CA_CERTS already set in environment: ${process.env.NODE_EXTRA_CA_CERTS}`)
    return
  }

  const path = extraCACerts ?? process.env.QILING_EXTRA_CA_CERTS
  if (path) {
    process.env.NODE_EXTRA_CA_CERTS = path
    logForDebugging(`CA certs: Applied NODE_EXTRA_CA_CERTS from config: ${path}`)
  }
}

/** @internal — for tests */
export function _resetAppliedFlagForTesting(): void {
  _applied = false
}
