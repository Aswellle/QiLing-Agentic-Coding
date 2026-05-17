/**
 * MCP Client — adapted from CC's services/mcp/client.ts
 *
 * Connects to MCP servers using the official @modelcontextprotocol/sdk.
 * Supports stdio, SSE, and HTTP transports with persistent connections.
 *
 * Adaptations from CC:
 *   - Removed OAuth, claude.ai proxy, XAA, WebSocket transports (CC-specific)
 *   - Removed analytics/telemetry (CC-specific)
 *   - Removed mcpOutputStorage (large blob persistence, CC-specific)
 *   - Simplified elicitation (basic user prompt support)
 *   - subprocessEnv → ../../utils/subprocessEnv
 *   - partiallySanitizeUnicode → ../../utils/sanitization
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  CallToolResultSchema,
  ErrorCode,
  ListResourcesResultSchema,
  ListToolsResultSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js'
import { subprocessEnv } from '../../utils/subprocessEnv'
import { partiallySanitizeUnicode } from '../../utils/sanitization'
import { expandMcpServerConfig } from './envExpansion'
import { buildMcpToolName } from './mcpStringUtils'
import { normalizeNameForMCP } from './normalization'
import type {
  ConnectedMCPServer,
  FailedMCPServer,
  MCPServerConnection,
  McpResourceInfo,
  McpServerConfig,
  McpStdioServerConfig,
  McpSSEServerConfig,
  McpHTTPServerConfig,
  McpToolCallResult,
  McpToolInfo,
  ScopedMcpServerConfig,
} from './types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function logDebug(msg: string): void {
  if (process.env.QILING_DEBUG === '1') console.error('[MCP]', msg)
}

function logError(err: Error | unknown): void {
  const msg = err instanceof Error ? err.message : String(err)
  console.error('[MCP error]', msg)
}

const MCP_USER_AGENT = `QiLing/0.4 (@modelcontextprotocol/sdk)`

// ─── Transport factory ────────────────────────────────────────────────────────

function isStdioConfig(c: McpServerConfig): c is McpStdioServerConfig {
  return 'command' in c
}

function isSSEConfig(c: McpServerConfig): c is McpSSEServerConfig {
  return c.type === 'sse'
}

function isHTTPConfig(c: McpServerConfig): c is McpHTTPServerConfig {
  return c.type === 'http'
}

async function createTransport(
  serverName: string,
  config: McpServerConfig,
) {
  const { config: expanded, missingVars } = expandMcpServerConfig(config)

  if (missingVars.length > 0) {
    throw new Error(
      `MCP server '${serverName}' references missing environment variables: ${missingVars.join(', ')}`
    )
  }

  if (isStdioConfig(expanded)) {
    const rawEnv = subprocessEnv()
    const env: Record<string, string> = {}
    for (const [k, v] of Object.entries(rawEnv)) {
      if (v !== undefined) env[k] = v
    }
    if (expanded.env) Object.assign(env, expanded.env)
    return new StdioClientTransport({
      command: expanded.command,
      args: expanded.args ?? [],
      env,
    })
  }

  if (isSSEConfig(expanded) || isHTTPConfig(expanded)) {
    const headers = {
      'User-Agent': MCP_USER_AGENT,
      ...(expanded.headers ?? {}),
    }

    const url = new URL(expanded.url)

    if (isHTTPConfig(expanded)) {
      return new StreamableHTTPClientTransport(url, {
        requestInit: { headers },
      })
    }

    return new SSEClientTransport(url, {
      requestInit: { headers },
      eventSourceInit: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, headers: { ...((init?.headers as Record<string, string>) ?? {}), ...headers } }),
      },
    })
  }

  throw new Error(`MCP server '${serverName}' has unsupported transport type: ${(config as { type?: string }).type}`)
}

// ─── Single server connection ─────────────────────────────────────────────────

/**
 * Connect to a single MCP server and return the connection state.
 * Returns ConnectedMCPServer on success, FailedMCPServer on error.
 */
export async function connectToMcpServer(
  serverName: string,
  config: ScopedMcpServerConfig,
  signal?: AbortSignal,
): Promise<ConnectedMCPServer | FailedMCPServer> {
  logDebug(`Connecting to MCP server: ${serverName}`)

  const client = new Client(
    { name: 'QiLing', version: '0.4' },
    { capabilities: { roots: { listChanged: false }, sampling: {} } }
  )

  try {
    const transport = await createTransport(serverName, config)

    await client.connect(transport)

    const capabilities = client.getServerCapabilities() ?? {}
    const serverVersion = client.getServerVersion()
    const instructions = client.getInstructions()

    logDebug(`Connected to MCP server: ${serverName} (${serverVersion?.name ?? 'unknown'} ${serverVersion?.version ?? ''})`)

    return {
      name: serverName,
      type: 'connected',
      client,
      capabilities,
      serverInfo: serverVersion ? { name: serverVersion.name, version: serverVersion.version } : undefined,
      instructions,
      config,
      cleanup: async () => {
        try { await client.close() } catch { /* ignore */ }
      },
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    logError(error)
    return {
      name: serverName,
      type: 'failed',
      config,
      error: error.message,
    }
  }
}

// ─── Tool listing ─────────────────────────────────────────────────────────────

/**
 * List all tools from a connected MCP server, with normalized names.
 * Returns empty array on error.
 */
export async function fetchToolsForClient(
  connection: ConnectedMCPServer,
): Promise<McpToolInfo[]> {
  if (!connection.capabilities.tools) return []

  try {
    const result = await connection.client.request(
      { method: 'tools/list', params: {} },
      ListToolsResultSchema,
    )

    type RawTool = { name: string; description?: string; inputSchema?: unknown }
    return ((result.tools ?? []) as RawTool[]).map(tool => ({
      name: buildMcpToolName(connection.name, tool.name),
      originalName: tool.name,
      description: tool.description,
      inputSchema: (tool.inputSchema ?? { type: 'object' }) as McpToolInfo['inputSchema'],
    }))
  } catch (err) {
    logError(err)
    return []
  }
}

// ─── Resource listing ─────────────────────────────────────────────────────────

/**
 * List all resources from a connected MCP server.
 */
export async function fetchResourcesForClient(
  connection: ConnectedMCPServer,
): Promise<McpResourceInfo[]> {
  if (!connection.capabilities.resources) return []

  try {
    const result = await connection.client.request(
      { method: 'resources/list', params: {} },
      ListResourcesResultSchema,
    )

    type RawResource = { uri: string; name: string; description?: string; mimeType?: string }
    return ((result.resources ?? []) as RawResource[]).map(r => ({
      uri: r.uri,
      name: r.name,
      description: r.description,
      mimeType: r.mimeType,
      server: connection.name,
    }))
  } catch (err) {
    logError(err)
    return []
  }
}

// ─── Tool execution ───────────────────────────────────────────────────────────

const MAX_MCP_OUTPUT_CHARS = 100_000

/**
 * Call an MCP tool on a connected server.
 *
 * Normalizes the tool name back to the server's original name before calling.
 * Sanitizes and truncates output to prevent context explosion.
 */
export async function callMcpTool(
  connection: ConnectedMCPServer,
  toolName: string,    // normalized mcp__server__tool name
  originalToolName: string,  // original tool name from server
  args: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<McpToolCallResult> {
  logDebug(`Calling MCP tool: ${toolName} on ${connection.name}`)

  try {
    const result = await connection.client.request(
      {
        method: 'tools/call',
        params: { name: originalToolName, arguments: args },
      },
      CallToolResultSchema,
      { signal },
    )

    // Process and sanitize content
    const content: McpToolCallResult['content'] = []
    let totalChars = 0

    for (const item of result.content ?? []) {
      if (item.type === 'text') {
        const sanitized = partiallySanitizeUnicode(item.text)
        const truncated = totalChars + sanitized.length > MAX_MCP_OUTPUT_CHARS
          ? sanitized.slice(0, MAX_MCP_OUTPUT_CHARS - totalChars) + '\n[... output truncated ...]'
          : sanitized
        totalChars += truncated.length
        content.push({ type: 'text', text: truncated })
      } else if (item.type === 'image') {
        content.push({ type: 'image', data: item.data, mimeType: item.mimeType })
      } else if (item.type === 'resource') {
        content.push({
          type: 'resource',
          uri: item.resource.uri,
          mimeType: 'mimeType' in item.resource ? item.resource.mimeType : undefined,
          text: 'text' in item.resource ? item.resource.text : undefined,
        })
      }
      if (totalChars >= MAX_MCP_OUTPUT_CHARS) break
    }

    return { content, isError: result.isError ?? false }
  } catch (err) {
    if (err instanceof McpError && err.code === ErrorCode.InvalidRequest) {
      return {
        content: [{ type: 'text', text: `MCP tool error: ${err.message}` }],
        isError: true,
      }
    }

    const msg = err instanceof Error ? err.message : String(err)
    logError(err)
    return {
      content: [{ type: 'text', text: `MCP connection error: ${msg}` }],
      isError: true,
    }
  }
}

// ─── Re-exports for convenience ───────────────────────────────────────────────
export { buildMcpToolName }
export type { MCPServerConnection, ConnectedMCPServer, FailedMCPServer }
