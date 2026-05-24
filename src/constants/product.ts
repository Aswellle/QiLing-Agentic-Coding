/**
 * Product URLs and remote session helpers — adapted from CC's constants/product.ts
 */

export const PRODUCT_URL = 'https://claude.com/claude-code'

export const CLAUDE_AI_BASE_URL = 'https://claude.ai'
// FROM CC: staging/local base URLs for remote session environment detection
export const CLAUDE_AI_STAGING_BASE_URL = 'https://claude-ai.staging.ant.dev' // NAME: staging URL
export const CLAUDE_AI_LOCAL_BASE_URL = 'http://localhost:4000'

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

// FROM CC: getClaudeAiBaseUrl — resolves base URL by environment
export function getClaudeAiBaseUrl(sessionId?: string, ingressUrl?: string): string {
  if (isRemoteSessionLocal(sessionId, ingressUrl)) return CLAUDE_AI_LOCAL_BASE_URL
  if (isRemoteSessionStaging(sessionId, ingressUrl)) return CLAUDE_AI_STAGING_BASE_URL
  return CLAUDE_AI_BASE_URL
}

/**
 * Get the base URL for Claude AI remote sessions.
 */
export function getRemoteSessionUrl(
  sessionId?: string,
  ingressUrl?: string,
): string {
  return getClaudeAiBaseUrl(sessionId, ingressUrl)
}
