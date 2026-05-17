import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'


// OAuth config per server is stored in settings.mcpServers[name].oauth
// Schema: { authorizationUrl, tokenUrl, clientId, clientSecret?, scopes?, callbackPort? }

const inputSchema = z.object({
  server: z.string().describe('Name of the MCP server to authenticate'),
  token: z.string().optional().describe(
    'If you already have a Bearer token, provide it here to skip the OAuth flow. ' +
    'Useful for Personal Access Tokens and similar static credentials.'
  ),
})

type Input = z.infer<typeof inputSchema>

// ─── PKCE helpers ─────────────────────────────────────────────────────────────

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const verifier = base64url(Buffer.from(crypto.getRandomValues(new Uint8Array(32))))
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = base64url(Buffer.from(hash))
  return { verifier, challenge }
}

function generateState(): string {
  return base64url(Buffer.from(crypto.getRandomValues(new Uint8Array(16))))
}

// ─── Local callback HTTP server ───────────────────────────────────────────────

async function waitForOAuthCallback(
  port: number,
  expectedState: string,
  timeoutMs = 120_000
): Promise<{ code: string } | { error: string }> {
  return new Promise((resolve) => {
    const server = Bun.serve({
      port,
      fetch(req) {
        const url = new URL(req.url)
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')
        const error = url.searchParams.get('error')

        if (error) {
          server.stop()
          resolve({ error: `OAuth error: ${error} — ${url.searchParams.get('error_description') ?? ''}` })
          return new Response('<html><body><h2>Authentication failed.</h2><p>You may close this tab.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } })
        }

        if (code && state === expectedState) {
          server.stop()
          resolve({ code })
          return new Response('<html><body><h2>Authentication successful!</h2><p>You may close this tab and return to QiLing.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } })
        }

        return new Response('Waiting for authentication...', { status: 200 })
      },
    })

    // Timeout guard
    setTimeout(() => {
      try { server.stop() } catch { /* already stopped */ }
      resolve({ error: 'OAuth timeout — no callback received within 2 minutes' })
    }, timeoutMs)
  })
}

// ─── Token exchange ───────────────────────────────────────────────────────────

async function exchangeCodeForToken(
  tokenUrl: string,
  code: string,
  clientId: string,
  clientSecret: string | undefined,
  redirectUri: string,
  codeVerifier: string
): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  })
  if (clientSecret) body.set('client_secret', clientSecret)

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`)
  }

  const data = await res.json() as { access_token?: string; error?: string }
  if (!data.access_token) {
    throw new Error(`No access_token in response: ${JSON.stringify(data)}`)
  }
  return data.access_token
}

// ─── Tool ─────────────────────────────────────────────────────────────────────

export const McpAuthTool: Tool<Input> = {
  name: 'McpAuth',

  description:
    'Authenticate to an MCP server that requires OAuth 2.0 or a Bearer token. ' +
    'Two modes:\n' +
    '  1. Static token: provide token= directly (for PATs, API keys).\n' +
    '  2. OAuth flow: if the server has oauth config in settings.mcpServers[name].oauth, ' +
    'this tool starts a PKCE authorization code flow, opens a local callback server, ' +
    'prints the auth URL for the user to visit, and waits for the callback. ' +
    'After success, the token is stored in-memory for this session. ' +
    'OAuth config fields: authorizationUrl, tokenUrl, clientId, scopes, clientSecret, callbackPort.',

  inputSchema,

  checkPermissions(): PermissionDecision { return { type: 'allow' } },

  async call(input: Input, _ctx: ToolContext): Promise<ToolResult> {
    // ── Mode 1: Static token ────────────────────────────────────────────────
    if (input.token) {
      // Store token for MCP server auth
const envKey = `QILING_MCP_TOKEN_${input.server.toUpperCase().replace(/-/g, "_")}`
process.env[envKey] = input.token
      return {
        content: [{ type: 'text', text: `Token stored for server '${input.server}'. Reconnect to pick up the new credentials.` }],
      }
    }

    // ── Mode 2: OAuth PKCE flow ─────────────────────────────────────────────
    // Read OAuth config from settings (loaded from .qiling/settings.json)
    // We access it via environment conventions since tool context doesn't carry settings
    const oauthConfigRaw = process.env[`QILING_MCP_OAUTH_${input.server.toUpperCase().replace(/-/g, '_')}`]
    let oauthConfig: {
      authorizationUrl: string
      tokenUrl: string
      clientId: string
      clientSecret?: string
      scopes?: string[]
      callbackPort?: number
    } | null = null

    if (oauthConfigRaw) {
      try { oauthConfig = JSON.parse(oauthConfigRaw) } catch { /* invalid */ }
    }

    if (!oauthConfig) {
      return {
        content: [{
          type: 'text',
          text: [
            `No OAuth config found for server '${input.server}'.`,
            '',
            'To configure OAuth, add to .qiling/settings.json:',
            `  "mcpServers": {`,
            `    "${input.server}": {`,
            `      "url": "https://...",`,
            `      "oauth": {`,
            `        "authorizationUrl": "https://provider.com/oauth/authorize",`,
            `        "tokenUrl": "https://provider.com/oauth/token",`,
            `        "clientId": "your-client-id",`,
            `        "scopes": ["read", "write"],`,
            `        "callbackPort": 8787`,
            `      }`,
            `    }`,
            `  }`,
            '',
            'Or provide a token directly: McpAuth(server="' + input.server + '", token="your-token")',
          ].join('\n'),
        }],
        isError: true,
      }
    }

    const { verifier, challenge } = await generatePKCE()
    const state = generateState()
    const port = oauthConfig.callbackPort ?? 8787
    const redirectUri = `http://localhost:${port}/callback`

    const authUrl = new URL(oauthConfig.authorizationUrl)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', oauthConfig.clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('code_challenge', challenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')
    if (oauthConfig.scopes?.length) {
      authUrl.searchParams.set('scope', oauthConfig.scopes.join(' '))
    }

    // Start callback listener
    const callbackPromise = waitForOAuthCallback(port, state)

    const instructions = [
      `Starting OAuth flow for '${input.server}'.`,
      '',
      'Open the following URL in your browser to authenticate:',
      authUrl.toString(),
      '',
      `Listening for callback on port ${port}...`,
      'The tool will complete automatically once you authorize.',
    ].join('\n')

    // Wait for callback
    const callbackResult = await callbackPromise

    if ('error' in callbackResult) {
      return {
        content: [{ type: 'text', text: `${instructions}\n\nAuthentication failed: ${callbackResult.error}` }],
        isError: true,
      }
    }

    // Exchange code for token
    let accessToken: string
    try {
      accessToken = await exchangeCodeForToken(
        oauthConfig.tokenUrl,
        callbackResult.code,
        oauthConfig.clientId,
        oauthConfig.clientSecret,
        redirectUri,
        verifier
      )
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Token exchange failed: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      }
    }

    // Store OAuth token for MCP server auth
const oauthEnvKey = `QILING_MCP_TOKEN_${input.server.toUpperCase().replace(/-/g, "_")}`
process.env[oauthEnvKey] = accessToken

    return {
      content: [{
        type: 'text',
        text: `Successfully authenticated to '${input.server}'. Token stored for this session.\nReconnect to the MCP server to use the new credentials.`,
      }],
    }
  },

  toDefinition() {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object' as const,
        properties: {
          server: { type: 'string', description: 'MCP server name to authenticate' },
          token: { type: 'string', description: 'Static Bearer token (skips OAuth flow)' },
        },
        required: ['server'],
      },
    }
  },
}
