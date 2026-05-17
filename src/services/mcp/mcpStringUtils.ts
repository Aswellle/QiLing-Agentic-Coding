/**
 * MCP string utilities — direct port of CC's services/mcp/mcpStringUtils.ts
 *
 * Pure utilities for MCP tool/server name parsing and construction.
 * Format: "mcp__serverName__toolName"
 */

import { normalizeNameForMCP } from './normalization'

/**
 * Parse MCP tool name string into server and tool components.
 * Returns null if not a valid MCP tool name.
 *
 * Known limitation: server names containing "__" will be mis-parsed.
 */
export function mcpInfoFromString(toolString: string): {
  serverName: string
  toolName: string | undefined
} | null {
  const parts = toolString.split('__')
  const [mcpPart, serverName, ...toolNameParts] = parts
  if (mcpPart !== 'mcp' || !serverName) return null
  const toolName = toolNameParts.length > 0 ? toolNameParts.join('__') : undefined
  return { serverName, toolName }
}

/**
 * Generate the mcp__server__ prefix for a given server name.
 */
export function getMcpPrefix(serverName: string): string {
  return `mcp__${normalizeNameForMCP(serverName)}__`
}

/**
 * Build a fully-qualified MCP tool name.
 * Inverse of mcpInfoFromString().
 *
 * @example buildMcpToolName('my-server', 'list_files') → 'mcp__my_server__list_files'
 */
export function buildMcpToolName(serverName: string, toolName: string): string {
  return `${getMcpPrefix(serverName)}${normalizeNameForMCP(toolName)}`
}

/**
 * Returns the permission-check name for an MCP tool.
 * Uses the fully-qualified mcp__server__tool name so deny rules
 * targeting builtins don't match unprefixed MCP replacements.
 */
export function getToolNameForPermissionCheck(tool: { name: string; isMcp?: boolean }): string {
  return tool.name
}

/**
 * Check if a tool name belongs to a specific MCP server.
 */
export function isToolFromMcpServer(toolName: string, serverName: string): boolean {
  const info = mcpInfoFromString(toolName)
  return info?.serverName === normalizeNameForMCP(serverName)
}

/**
 * Check if a tool is an MCP tool (by name prefix or isMcp flag).
 */
export function isMcpTool(tool: { name: string; isMcp?: boolean }): boolean {
  return tool.name?.startsWith('mcp__') || tool.isMcp === true
}
