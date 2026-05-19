/**
 * OAuth redirect port helpers — adapted from CC's services/mcp/oauthPort.ts
 *
 * Finds an available localhost port for OAuth redirect URIs.
 * Windows uses 39152-49151 range; other platforms use 49152-65535.
 * Respects MCP_OAUTH_CALLBACK_PORT environment variable override.
 */

import { createServer } from 'http'

const REDIRECT_PORT_RANGE =
  process.platform === 'win32'
    ? { min: 39152, max: 49151 }
    : { min: 49152, max: 65535 }
const REDIRECT_PORT_FALLBACK = 3118

export function buildRedirectUri(port: number = REDIRECT_PORT_FALLBACK): string {
  return `http://localhost:${port}/callback`
}

function getMcpOAuthCallbackPort(): number | undefined {
  const port = parseInt(process.env.MCP_OAUTH_CALLBACK_PORT || '', 10)
  return port > 0 ? port : undefined
}

export async function findAvailablePort(): Promise<number> {
  const configuredPort = getMcpOAuthCallbackPort()
  if (configuredPort) return configuredPort

  const { min, max } = REDIRECT_PORT_RANGE
  const range = max - min + 1
  const maxAttempts = Math.min(range, 100)

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = min + Math.floor(Math.random() * range)
    try {
      await new Promise<void>((resolve, reject) => {
        const server = createServer()
        server.once('error', reject)
        server.listen(port, () => server.close(() => resolve()))
      })
      return port
    } catch {
      continue
    }
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const server = createServer()
      server.once('error', reject)
      server.listen(REDIRECT_PORT_FALLBACK, () => server.close(() => resolve()))
    })
    return REDIRECT_PORT_FALLBACK
  } catch {
    throw new Error('No available ports for OAuth redirect')
  }
}
