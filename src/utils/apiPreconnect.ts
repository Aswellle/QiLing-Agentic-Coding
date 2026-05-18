/**
 * API preconnect — adapted from CC's utils/apiPreconnect.ts
 *
 * Fires a HEAD request to the Anthropic API during startup to overlap the
 * TCP+TLS handshake (~100-200ms) with other init work. Bun's fetch shares
 * a keep-alive connection pool globally, so the real API request reuses the
 * warmed connection without a second handshake.
 *
 * Call this AFTER environment variables (ANTHROPIC_BASE_URL, proxy, CA certs)
 * are applied so the warmed connection uses the correct transport and cert store.
 *
 * Skipped when:
 * - Using Bedrock/Vertex (different endpoints and auth)
 * - Behind a proxy or using mTLS (custom dispatcher doesn't share the global pool)
 * - ANTHROPIC_BASE_URL is not the default Anthropic API
 */

let fired = false

const DEFAULT_ANTHROPIC_API = 'https://api.anthropic.com'

export function preconnectAnthropicApi(): void {
  if (fired) return
  fired = true

  // Skip for non-Anthropic providers
  if (
    process.env.CLAUDE_CODE_USE_BEDROCK === '1' ||
    process.env.QILING_USE_BEDROCK === '1' ||
    process.env.CLAUDE_CODE_USE_VERTEX === '1' ||
    process.env.QILING_USE_VERTEX === '1'
  ) {
    return
  }

  // Skip when proxy or mTLS is configured — the SDK's custom dispatcher
  // won't reuse the preconnected pool, so we'd warm the wrong socket
  if (
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.ANTHROPIC_UNIX_SOCKET ||
    process.env.CLAUDE_CODE_CLIENT_CERT ||
    process.env.QILING_CLIENT_CERT
  ) {
    return
  }

  const baseUrl = process.env.ANTHROPIC_BASE_URL || DEFAULT_ANTHROPIC_API

  // Fire and forget. HEAD has no response body — the connection is immediately
  // eligible for keep-alive pool reuse after headers arrive. 10s timeout so a
  // slow network doesn't hang the process; abort is fine since the real request
  // will handshake fresh if needed.
  void fetch(baseUrl, {
    method: 'HEAD',
    signal: AbortSignal.timeout(10_000),
  }).catch(() => { /* ignore preconnect failures — real request handles them */ })
}

/** @internal — reset for tests */
export function _resetPreconnectFlagForTesting(): void {
  fired = false
}
