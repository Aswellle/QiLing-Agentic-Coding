/**
 * Product URLs and remote session helpers — adapted from CC's constants/product.ts
 */

export const PRODUCT_URL = 'https://claude.com/claude-code'

export const CLAUDE_AI_BASE_URL = 'https://claude.ai'

/**
 * Check if a session is in staging environment.
 */
export function isRemoteSessionStaging(
  sessionId?: string,
  ingressUrl?: string,
): boolean {
  return (
    sessionId?.includes('_staging_') === true ||
    ingressUrl?.includes('staging') === true
  )
}

/**
 * Check if a session is in local-dev environment.
 */
export function isRemoteSessionLocal(
  sessionId?: string,
  ingressUrl?: string,
): boolean {
  return (
    sessionId?.includes('_local_') === true ||
    ingressUrl?.includes('localhost') === true
  )
}

/**
 * Get the base URL for Claude AI remote sessions.
 */
export function getRemoteSessionUrl(
  sessionId?: string,
  ingressUrl?: string,
): string {
  if (isRemoteSessionLocal(sessionId, ingressUrl)) return 'http://localhost:4000'
  return CLAUDE_AI_BASE_URL
}
