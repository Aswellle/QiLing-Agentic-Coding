/**
 * MCP client merge hook — adapted from CC's hooks/useMergedClients.ts
 *
 * Merges initial MCP clients with dynamically discovered ones, deduplicating by name.
 */

import { useMemo } from 'react'
import type { MCPServerConnection } from '../services/mcp/types.js'

export function mergeClients(
  initialClients: MCPServerConnection[] | undefined,
  mcpClients: readonly MCPServerConnection[] | undefined,
): MCPServerConnection[] {
  if (initialClients && mcpClients && mcpClients.length > 0) {
    // Deduplicate by name (initialClients take precedence)
    const seen = new Set(initialClients.map(c => c.name))
    const newClients = mcpClients.filter(c => !seen.has(c.name))
    return [...initialClients, ...newClients]
  }
  return initialClients ?? []
}

export function useMergedClients(
  initialClients: MCPServerConnection[] | undefined,
  mcpClients: MCPServerConnection[] | undefined,
): MCPServerConnection[] {
  return useMemo(
    () => mergeClients(initialClients, mcpClients),
    [initialClients, mcpClients],
  )
}
