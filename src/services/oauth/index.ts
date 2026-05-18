/**
 * OAuth 2.0 PKCE Service — adapted from CC's services/oauth/index.ts
 *
 * Implements the OAuth 2.0 Authorization Code flow with PKCE (RFC 7636).
 *
 * CC's version is tightly coupled to Anthropic's OAuth endpoints.
 * QiLing adaptation: fully generic — works with any OAuth 2.0 provider
 * (Anthropic, GitHub, Google, MCP servers, etc.).
 *
 * Usage:
 *   const service = new OAuthService({ ... })
 *   const tokens = await service.startFlow(url => openBrowser(url))
 *   // tokens.accessToken, tokens.refreshToken, tokens.expiresAt
 */

import { AuthCodeListener } from './authCodeListener'
import { generateCodeVerifier, generateCodeChallenge, generateState } from './crypto'

// ─── Types ────────────────────────────────────────────────────────────────────

export type OAuthConfig = {
  /** OAuth 2.0 authorization endpoint URL */
  authorizationUrl: string
  /** OAuth 2.0 token endpoint URL */
  tokenUrl: string
  /** Client ID registered with the OAuth provider */
  clientId: string
  /** OAuth scopes to request */
  scopes: string[]
  /** Client secret (optional, for confidential clients) */
  clientSecret?: string
  /** Extra parameters to add to the authorization URL */
  extraParams?: Record<string, string>
}

export type OAuthTokens = {
  accessToken: string
  refreshToken?: string
  tokenType: string
  expiresIn?: number
  /** Computed absolute expiry timestamp (Date.now() + expiresIn * 1000) */
  expiresAt?: number
  scope?: string
  /** Raw token response for additional fields */
  raw?: Record<string, unknown>
}

export type OAuthFlowOptions = {
  /** Override the redirect URI (default: http://localhost:[port]/callback) */
  redirectUri?: string
  /** Success page URL to redirect browser after successful auth */
  successUrl?: string
  /** Port for the callback listener (default: OS-assigned) */
  port?: number
}

// ─── Token exchange helper ─────────────────────────────────────────────────────

async function exchangeCodeForTokens(
  tokenUrl: string,
  code: string,
  codeVerifier: string,
  redirectUri: string,
  clientId: string,
  clientSecret?: string,
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  })
  if (clientSecret) body.set('client_secret', clientSecret)

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Token exchange failed (${response.status}): ${text}`)
  }

  const data = (await response.json()) as Record<string, unknown>

  const accessToken = String(data.access_token ?? '')
  if (!accessToken) throw new Error('No access_token in token response')

  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : undefined

  return {
    accessToken,
    refreshToken: data.refresh_token ? String(data.refresh_token) : undefined,
    tokenType: String(data.token_type ?? 'Bearer'),
    expiresIn,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined,
    scope: data.scope ? String(data.scope) : undefined,
    raw: data,
  }
}

// ─── OAuthService ─────────────────────────────────────────────────────────────

/**
 * Generic OAuth 2.0 PKCE flow service.
 *
 * Ported from CC's OAuthService with Anthropic-specific logic removed.
 * Supports any OAuth 2.0 provider that supports PKCE.
 */
export class OAuthService {
  private readonly config: OAuthConfig
  private codeVerifier: string
  private listener: AuthCodeListener | null = null

  constructor(config: OAuthConfig) {
    this.config = config
    this.codeVerifier = generateCodeVerifier()
  }

  /**
   * Start the OAuth flow.
   *
   * @param onAuthUrl Called with the authorization URL to open in a browser.
   *   If you return a custom handler, it receives both the auth URL and a
   *   fallback "manual" URL where the user can copy-paste the code.
   *
   * @param options Flow options (redirect URI, port, success URL)
   * @returns OAuth tokens on success
   */
  async startFlow(
    onAuthUrl: (authUrl: string, manualFallbackUrl?: string) => Promise<void>,
    options: OAuthFlowOptions = {},
  ): Promise<OAuthTokens> {
    this.listener = new AuthCodeListener()
    const port = await this.listener.start(options.port)

    const redirectUri = options.redirectUri ?? `http://localhost:${port}/callback`
    const codeChallenge = generateCodeChallenge(this.codeVerifier)
    const state = generateState()

    const authUrl = this.buildAuthUrl(codeChallenge, state, redirectUri)
    const manualUrl = this.buildAuthUrl(codeChallenge, state, 'urn:ietf:wg:oauth:2.0:oob')

    const code = await this.listener.waitForAuthorization(state, async () => {
      await onAuthUrl(authUrl, manualUrl)
    })

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(
      this.config.tokenUrl,
      code,
      this.codeVerifier,
      redirectUri,
      this.config.clientId,
      this.config.clientSecret,
    )

    // Redirect browser to success page
    this.listener.handleSuccessRedirect(options.successUrl ?? 'about:blank')
    this.listener.close()
    this.listener = null

    return tokens
  }

  /**
   * Submit an authorization code manually (for non-browser environments).
   * The user visits the auth URL and pastes the code here.
   */
  async exchangeManualCode(
    code: string,
    redirectUri = 'urn:ietf:wg:oauth:2.0:oob',
  ): Promise<OAuthTokens> {
    return exchangeCodeForTokens(
      this.config.tokenUrl,
      code,
      this.codeVerifier,
      redirectUri,
      this.config.clientId,
      this.config.clientSecret,
    )
  }

  /**
   * Refresh tokens using a refresh_token.
   */
  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
    })
    if (this.config.clientSecret) body.set('client_secret', this.config.clientSecret)

    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`Token refresh failed (${response.status}): ${text}`)
    }

    const data = (await response.json()) as Record<string, unknown>
    const accessToken = String(data.access_token ?? '')
    if (!accessToken) throw new Error('No access_token in refresh response')

    const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : undefined

    return {
      accessToken,
      refreshToken: data.refresh_token ? String(data.refresh_token) : refreshToken,
      tokenType: String(data.token_type ?? 'Bearer'),
      expiresIn,
      expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined,
      scope: data.scope ? String(data.scope) : undefined,
      raw: data,
    }
  }

  /**
   * Build the OAuth authorization URL.
   */
  buildAuthUrl(
    codeChallenge: string,
    state: string,
    redirectUri: string,
  ): string {
    const url = new URL(this.config.authorizationUrl)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id', this.config.clientId)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('scope', this.config.scopes.join(' '))
    url.searchParams.set('state', state)
    url.searchParams.set('code_challenge', codeChallenge)
    url.searchParams.set('code_challenge_method', 'S256')

    for (const [key, value] of Object.entries(this.config.extraParams ?? {})) {
      url.searchParams.set(key, value)
    }

    return url.toString()
  }

  /** Clean up the listener if flow was abandoned */
  abort(): void {
    this.listener?.close()
    this.listener = null
  }

  /** Check if tokens are expired (or about to expire in the next 60s) */
  static isExpired(tokens: OAuthTokens, bufferMs = 60_000): boolean {
    if (!tokens.expiresAt) return false
    return Date.now() + bufferMs >= tokens.expiresAt
  }
}

// ─── Convenience exports ──────────────────────────────────────────────────────
export { generateCodeVerifier, generateCodeChallenge, generateState } from './crypto'
export { AuthCodeListener } from './authCodeListener'
