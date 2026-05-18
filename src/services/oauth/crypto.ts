/**
 * OAuth PKCE cryptographic utilities — direct port of CC's services/oauth/crypto.ts
 *
 * Implements RFC 7636 Proof Key for Code Exchange (PKCE).
 * Used by OAuthService and MCP server OAuth flows.
 */

import { createHash, randomBytes } from 'node:crypto'

function base64URLEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/** Generate a cryptographically random code verifier (PKCE) */
export function generateCodeVerifier(): string {
  return base64URLEncode(randomBytes(32))
}

/** Derive the code challenge from a verifier using S256 method */
export function generateCodeChallenge(verifier: string): string {
  const hash = createHash('sha256')
  hash.update(verifier)
  return base64URLEncode(hash.digest())
}

/** Generate a random state parameter for CSRF protection */
export function generateState(): string {
  return base64URLEncode(randomBytes(32))
}
