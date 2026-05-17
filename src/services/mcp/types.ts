/**
 * MCP types — adapted from CC's services/mcp/types.ts
 *
 * Simplified for QiLing (removes CC-specific types like claudeai-proxy,
 * ws-ide, sse-ide, sdk while keeping the core portable types).
 */

import { z } from 'zod'
import type { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

// ─── Config scope ─────────────────────────────────────────────────────────────

export const CONFIG_SCOPES = ['global', 'project', 'session'] as const
export type ConfigScope = (typeof CONFIG_SCOPES)[number]

// ─── Server config schemas ────────────────────────────────────────────────────

export const McpStdioServerConfigSchema = z.object({
  type: z.literal('stdio').optional(),
  command: z.string().min(1, 'Command cannot be empty'),
  args: z.array(z.string()).default([]),
  env: z.record(z.string(), z.string()).optional(),
})
export type McpStdioServerConfig = z.infer<typeof McpStdioServerConfigSchema>

export const McpSSEServerConfigSchema = z.object({
  type: z.literal('sse'),
  url: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
})
export type McpSSEServerConfig = z.infer<typeof McpSSEServerConfigSchema>

export const McpHTTPServerConfigSchema = z.object({
  type: z.literal('http'),
  url: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
})
export type McpHTTPServerConfig = z.infer<typeof McpHTTPServerConfigSchema>

export const McpServerConfigSchema = z.union([
  McpStdioServerConfigSchema,
  McpSSEServerConfigSchema,
  McpHTTPServerConfigSchema,
])
export type McpServerConfig = z.infer<typeof McpServerConfigSchema>

export type ScopedMcpServerConfig = McpServerConfig & {
  scope: ConfigScope
}

// ─── Connection state types ───────────────────────────────────────────────────

export type ConnectedMCPServer = {
  name: string
  type: 'connected'
  client: Client
  capabilities: ServerCapabilities
  serverInfo?: { name: string; version: string }
  instructions?: string
  config: ScopedMcpServerConfig
  cleanup: () => Promise<void>
}

export type FailedMCPServer = {
  name: string
  type: 'failed'
  config: ScopedMcpServerConfig
  error?: string
}

export type PendingMCPServer = {
  name: string
  type: 'pending'
  config: ScopedMcpServerConfig
  reconnectAttempt?: number
}

export type DisabledMCPServer = {
  name: string
  type: 'disabled'
  config: ScopedMcpServerConfig
}

export type MCPServerConnection =
  | ConnectedMCPServer
  | FailedMCPServer
  | PendingMCPServer
  | DisabledMCPServer

// ─── Tool & resource types ────────────────────────────────────────────────────

export type McpToolInfo = {
  name: string
  originalName: string  // pre-normalization name from server
  description?: string
  inputSchema: {
    type: 'object'
    properties?: Record<string, unknown>
    required?: string[]
  }
}

export type McpResourceInfo = {
  uri: string
  name: string
  description?: string
  mimeType?: string
  server: string
}

export type McpToolCallResult = {
  content: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; data: string; mimeType: string }
    | { type: 'resource'; uri: string; mimeType?: string; text?: string }
  >
  isError?: boolean
}
