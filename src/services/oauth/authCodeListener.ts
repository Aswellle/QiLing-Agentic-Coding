/**
 * OAuth Authorization Code Listener — direct port of CC's services/oauth/auth-code-listener.ts
 *
 * A temporary localhost HTTP server that captures OAuth authorization code redirects.
 * Used by the OAuthService for the automatic browser flow.
 *
 * When the user authorizes in their browser, the OAuth provider redirects to:
 *   http://localhost:[port]/callback?code=AUTH_CODE&state=STATE
 *
 * This server captures that redirect and resolves the authorization code promise.
 */

import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'

export class AuthCodeListener {
  private localServer: Server
  private port = 0
  private promiseResolver: ((code: string) => void) | null = null
  private promiseRejecter: ((err: Error) => void) | null = null
  private expectedState: string | null = null
  private pendingResponse: ServerResponse | null = null
  private readonly callbackPath: string

  constructor(callbackPath = '/callback') {
    this.localServer = createServer()
    this.callbackPath = callbackPath
  }

  /** Start the listener. Returns the assigned port. */
  async start(port?: number): Promise<number> {
    return new Promise((resolve, reject) => {
      this.localServer.once('error', err => {
        reject(new Error(`Failed to start OAuth callback server: ${err.message}`))
      })
      this.localServer.listen(port ?? 0, 'localhost', () => {
        this.port = (this.localServer.address() as AddressInfo).port
        resolve(this.port)
      })
    })
  }

  getPort(): number { return this.port }
  hasPendingResponse(): boolean { return this.pendingResponse !== null }

  /**
   * Wait for the OAuth redirect. Calls onReady() once the server is listening
   * (use it to open the browser or print the auth URL).
   */
  async waitForAuthorization(
    state: string,
    onReady: () => Promise<void>,
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.promiseResolver = resolve
      this.promiseRejecter = reject
      this.expectedState = state

      this.localServer.on('request', this.handleRedirect.bind(this))
      this.localServer.on('error', this.handleError.bind(this))

      void onReady()
    })
  }

  /**
   * Complete the flow: redirect the browser to a success page.
   * Call this after exchanging the auth code for tokens.
   */
  handleSuccessRedirect(
    successUrl: string,
    customHandler?: (res: ServerResponse) => void,
  ): void {
    if (!this.pendingResponse) return
    if (customHandler) {
      customHandler(this.pendingResponse)
    } else {
      this.pendingResponse.writeHead(302, { Location: successUrl })
      this.pendingResponse.end()
    }
    this.pendingResponse = null
  }

  /** Redirect to an error page and close. */
  handleErrorRedirect(errorUrl?: string): void {
    if (!this.pendingResponse) return
    this.pendingResponse.writeHead(302, { Location: errorUrl ?? 'about:blank' })
    this.pendingResponse.end()
    this.pendingResponse = null
  }

  private handleRedirect(req: IncomingMessage, res: ServerResponse): void {
    const url = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`)
    if (url.pathname !== this.callbackPath) {
      res.writeHead(404)
      res.end()
      return
    }
    const authCode = url.searchParams.get('code') ?? undefined
    const state = url.searchParams.get('state') ?? undefined
    this.validateAndRespond(authCode, state, res)
  }

  private validateAndRespond(
    authCode: string | undefined,
    state: string | undefined,
    res: ServerResponse,
  ): void {
    if (!authCode) {
      res.writeHead(400); res.end('Authorization code not found')
      this.reject(new Error('No authorization code received'))
      return
    }
    if (state !== this.expectedState) {
      res.writeHead(400); res.end('Invalid state parameter')
      this.reject(new Error('Invalid state parameter — possible CSRF attack'))
      return
    }
    // Hold response for caller to redirect after token exchange
    this.pendingResponse = res
    this.resolve(authCode)
  }

  private handleError(err: Error): void {
    console.error('[OAuth]', err.message)
    this.close()
    this.reject(err)
  }

  private resolve(code: string): void {
    if (this.promiseResolver) {
      this.promiseResolver(code)
      this.promiseResolver = this.promiseRejecter = null
    }
  }

  private reject(err: Error): void {
    if (this.promiseRejecter) {
      this.promiseRejecter(err)
      this.promiseResolver = this.promiseRejecter = null
    }
  }

  close(): void {
    if (this.pendingResponse) this.handleErrorRedirect()
    this.localServer.removeAllListeners()
    this.localServer.close()
  }
}
