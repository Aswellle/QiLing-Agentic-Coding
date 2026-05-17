/**
 * MCP Manager compatibility shim — delegates to services/mcp/manager
 *
 * Phase 5: This file is now a thin wrapper. The real implementation
 * lives in src/services/mcp/manager.ts using @modelcontextprotocol/sdk.
 *
 * Kept for backwards compatibility with /mcp command and other callers.
 */

export {
  addMcpServer,
  removeMcpServer,
  getMcpStatus,
  formatMcpStatus,
} from '../services/mcp/manager'

export type { McpServerConfig } from '../services/mcp/types'
