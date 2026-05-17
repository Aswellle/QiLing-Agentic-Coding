/**
 * MCP name normalization — direct port of CC's services/mcp/normalization.ts
 *
 * Pure utility, no dependencies.
 */

const CLAUDEAI_SERVER_PREFIX = 'claude.ai '

/**
 * Normalize server/tool names to match API pattern ^[a-zA-Z0-9_-]{1,64}$
 * Replaces invalid characters (dots, spaces, etc.) with underscores.
 */
export function normalizeNameForMCP(name: string): string {
  let normalized = name.replace(/[^a-zA-Z0-9_-]/g, '_')
  if (name.startsWith(CLAUDEAI_SERVER_PREFIX)) {
    normalized = normalized.replace(/_+/g, '_').replace(/^_|_$/g, '')
  }
  return normalized
}
