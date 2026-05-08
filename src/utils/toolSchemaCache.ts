/**
 * Session-scoped tool schema cache — ported from CC's utils/toolSchemaCache.ts
 *
 * Caches rendered tool definitions per session to prevent cache busting.
 * Any byte-level change to tool schemas busts the server-side prompt cache.
 * This cache locks schema bytes at first render — dynamic content or mid-session
 * flag changes no longer bust the 11K-token tool block.
 */

import type { ToolDefinition } from '../types/tool'

const TOOL_SCHEMA_CACHE = new Map<string, ToolDefinition>()

export function getToolSchemaCache(): Map<string, ToolDefinition> {
  return TOOL_SCHEMA_CACHE
}

export function clearToolSchemaCache(): void {
  TOOL_SCHEMA_CACHE.clear()
}

/** Get a cached schema or build one using the factory function. */
export function getCachedToolSchema(name: string, build: () => ToolDefinition): ToolDefinition {
  const cached = TOOL_SCHEMA_CACHE.get(name)
  if (cached) return cached
  const schema = build()
  TOOL_SCHEMA_CACHE.set(name, schema)
  return schema
}
