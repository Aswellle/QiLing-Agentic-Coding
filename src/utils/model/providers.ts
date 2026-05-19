/**
 * API provider detection — adapted from CC's utils/model/providers.ts
 *
 * Detects which Anthropic API provider to use based on environment variables.
 * QiLing also supports additional providers (Gemini, Qwen, etc.) via the
 * settings.provider field; this module handles the CC-compatible env var path.
 */

export type APIProvider = 'firstParty' | 'bedrock' | 'vertex' | 'foundry'

/**
 * Get the active CC-compatible API provider from environment variables.
 * QiLing's full provider list (Gemini, Qwen, etc.) is in settings/schema.ts.
 */
export function getAPIProvider(): APIProvider {
  if (process.env.CLAUDE_CODE_USE_BEDROCK === '1' || process.env.QILING_USE_BEDROCK === '1') {
    return 'bedrock'
  }
  if (process.env.CLAUDE_CODE_USE_VERTEX === '1' || process.env.QILING_USE_VERTEX === '1') {
    return 'vertex'
  }
  if (process.env.CLAUDE_CODE_USE_FOUNDRY === '1' || process.env.QILING_USE_FOUNDRY === '1') {
    return 'foundry'
  }
  return 'firstParty'
}

/**
 * Check if ANTHROPIC_BASE_URL points to the first-party Anthropic API.
 * Returns true when not set (default API) or points to api.anthropic.com.
 */
export function isFirstPartyAnthropicBaseUrl(): boolean {
  const baseUrl = process.env.ANTHROPIC_BASE_URL
  if (!baseUrl) return true
  try {
    const host = new URL(baseUrl).host
    return host === 'api.anthropic.com'
  } catch {
    return false
  }
}
