/**
 * MCP Tool Bridge — Phase 5 upgrade to persistent SDK-based connections
 *
 * Phase 5 changes:
 *   - Uses @modelcontextprotocol/sdk via services/mcp/manager
 *   - Persistent connections: one Client per server, reused across calls
 *   - Proper tool name normalization: mcp__server__tool (CC naming)
 *   - Supports stdio, SSE, HTTP transports
 *   - Backwards-compatible loadMcpTools() still available for startup init
 */

import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, ToolDefinition } from '../types/tool'
import { partiallySanitizeUnicode } from '../utils/sanitization'
import { subprocessEnv } from '../utils/subprocessEnv'
import {
  getMcpConnection,
  addMcpConnection,
  getMcpTools,
  getAllMcpTools,
  getMcpResources,
  getAllMcpResources,
  initializeMcpConnections,
  waitForMcpInit,
} from '../services/mcp/manager'
import { callMcpTool } from '../services/mcp/client'
import { buildMcpToolName, isMcpTool, mcpInfoFromString } from '../services/mcp/mcpStringUtils'
import type { McpServerConfig } from '../services/mcp/types'



// Re-export for backwards compatibility
export type { McpServerConfig }

// ─── Registry shims (backwards compat) ───────────────────────────────────────

/** Get a registered MCP client — now delegates to manager */
export function getRegisteredMcpClient(serverName: string) {
  return getMcpConnection(serverName)
}

export function listRegisteredMcpServers(): string[] {
  const { getAllMcpConnections } = require('../services/mcp/manager')
  return Array.from((getAllMcpConnections() as Map<string, unknown>).keys()) as string[]
}

// ─── Tool builder (from manager connections) ──────────────────────────────────

/**
 * Build QiLing Tool objects from all connected MCP servers via manager.
 * Call after initializeMcpConnections() has resolved.
 */
export async function buildMcpToolsFromManager(): Promise<Tool[]> {
  await waitForMcpInit()
  const allToolInfos = getAllMcpTools()
  return allToolInfos.map(info => buildSingleMcpTool(info.name, info.originalName, info.description))
}

function buildSingleMcpTool(
  toolName: string,       // normalized: mcp__server__tool
  originalToolName: string, // server's original tool name
  description?: string,
): Tool<Record<string, unknown>> {
  const info = mcpInfoFromString(toolName)
  const serverName = info?.serverName ?? ''

  return {
    name: toolName,
    description: description ? `[MCP: ${serverName}] ${description}` : `[MCP: ${serverName}] ${toolName}`,
    inputSchema: z.record(z.unknown()),
    isConcurrencySafe(_input) { return true },

    async call(input: Record<string, unknown>, _ctx: ToolContext): Promise<ToolResult> {
      const conn = getMcpConnection(serverName)
      if (!conn) {
        return {
          content: [{ type: 'text', text: `MCP server '${serverName}' is not connected. Run /mcp status to check.` }],
          isError: true,
        }
      }

      const result = await callMcpTool(conn, toolName, originalToolName, input)

      // Format result content
      const text = result.content
        .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
        .map(c => partiallySanitizeUnicode(c.text))
        .join('\n')

      return {
        content: [{ type: 'text', text: text || '(no output)' }],
        isError: result.isError,
      }
    },

    toDefinition(): ToolDefinition {
      return {
        name: toolName,
        description: description ?? toolName,
        input_schema: {
          type: 'object',
          properties: {},
          required: [],
        },
      }
    },
  }
}

// ─── Legacy loadMcpTools (still used by startup init) ────────────────────────

interface LegacyMcpServerConfig {
  name: string
  transport: 'stdio' | 'sse' | 'http'
  command?: string
  args?: string[]
  url?: string
  env?: Record<string, string>
  headers?: Record<string, string>
}

/**
 * Connect to an MCP server and return QiLing Tool objects.
 * Now delegates to the manager for persistent connections.
 */
export async function loadMcpTools(config: LegacyMcpServerConfig): Promise<Tool[]> {
  const mcpConfig: McpServerConfig = config.command
    ? { type: 'stdio', command: config.command, args: config.args ?? [], env: config.env }
    : config.transport === 'http'
      ? { type: 'http', url: config.url!, headers: config.headers }
      : { type: 'sse', url: config.url!, headers: config.headers }

  const conn = await addMcpConnection(config.name, mcpConfig)

  if (conn.type !== 'connected') {
    throw new Error(`Failed to connect to MCP server '${config.name}': ${conn.type === 'failed' ? conn.error : 'not connected'}`)
  }

  const toolInfos = getMcpTools(config.name)
  return toolInfos.map(info => buildSingleMcpTool(info.name, info.originalName, info.description))
}

/**
 * Load all MCP tools from settings config (called at REPL startup).
 * Initializes the manager and returns all tools.
 */
export interface McpConfig {
  mcpServers?: Record<string, {
    command?: string
    args?: string[]
    url?: string
    env?: Record<string, string>
    headers?: Record<string, string>
    type?: 'stdio' | 'sse' | 'http'
  }>
}

export async function loadAllMcpTools(mcpConfig: McpConfig, cwd?: string): Promise<Tool[]> {
  if (!mcpConfig.mcpServers) return []

  const servers: Record<string, McpServerConfig> = {}
  for (const [name, rawConfig] of Object.entries(mcpConfig.mcpServers)) {
    if (rawConfig.command) {
      servers[name] = { type: 'stdio', command: rawConfig.command, args: rawConfig.args ?? [], env: rawConfig.env }
    } else if (rawConfig.url) {
      const type = rawConfig.type ?? 'sse'
      servers[name] = type === 'http'
        ? { type: 'http', url: rawConfig.url, headers: rawConfig.headers }
        : { type: 'sse', url: rawConfig.url, headers: rawConfig.headers }
    }
  }

  initializeMcpConnections(servers, cwd ?? process.cwd())
  await waitForMcpInit()

  return buildMcpToolsFromManager()
}

// Re-export utilities
export { isMcpTool, mcpInfoFromString, buildMcpToolName, getMcpResources, getAllMcpResources }
