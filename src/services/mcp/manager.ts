/**
 * MCP Connection Manager — adapted from CC's services/mcp/ pattern
 *
 * Maintains a registry of persistent MCP server connections.
 * Connections are created on first use and reused across tool calls.
 *
 * Lifecycle:
 *   - initializeMcpConnections(settings, cwd) — called at REPL startup
 *   - getMcpConnection(serverName)            — returns live connection
 *   - shutdownMcpConnections()                — called at exit
 */

import { loadSettings } from '../../settings/loader'
import {
  connectToMcpServer,
  fetchToolsForClient,
  fetchResourcesForClient,
} from './client'
import type {
  ConnectedMCPServer,
  MCPServerConnection,
  McpResourceInfo,
  McpServerConfig,
  McpToolInfo,
  ScopedMcpServerConfig,
} from './types'

function logDebug(msg: string) { if (process.env.QILING_DEBUG === '1') console.error('[MCP]', msg) }
function logError(e: unknown) { console.error('[MCP error]', e instanceof Error ? e.message : e) }

// ─── Registry ─────────────────────────────────────────────────────────────────

/** Active MCP server connections */
const _connections = new Map<string, MCPServerConnection>()
/** Cached tool lists per server (refreshed on reconnect) */
const _tools = new Map<string, McpToolInfo[]>()
/** Cached resource lists per server */
const _resources = new Map<string, McpResourceInfo[]>()

let _initialized = false
let _initPromise: Promise<void> | null = null

// ─── Public API ───────────────────────────────────────────────────────────────

/** Initialize all MCP connections from settings. Call once at startup. */
export function initializeMcpConnections(
  mcpServers: Record<string, McpServerConfig>,
  cwd: string,
): void {
  if (_initialized || _initPromise) return
  _initPromise = _doInit(mcpServers, cwd)
    .then(() => { _initialized = true })
    .catch(err => { logError(err) })
}

async function _doInit(
  mcpServers: Record<string, McpServerConfig>,
  cwd: string,
): Promise<void> {
  const entries = Object.entries(mcpServers)
  if (entries.length === 0) return

  logDebug(`Initializing ${entries.length} MCP server(s)`)

  await Promise.allSettled(entries.map(async ([name, rawConfig]) => {
    const config: ScopedMcpServerConfig = { ...rawConfig, scope: 'project' }
    const conn = await connectToMcpServer(name, config)
    _connections.set(name, conn)

    if (conn.type === 'connected') {
      const [tools, resources] = await Promise.all([
        fetchToolsForClient(conn),
        fetchResourcesForClient(conn),
      ])
      _tools.set(name, tools)
      _resources.set(name, resources)
      logDebug(`MCP server '${name}': ${tools.length} tools, ${resources.length} resources`)
    } else {
      logDebug(`MCP server '${name}': failed — ${conn.error}`)
    }
  }))
}

/** Wait for initialization to complete */
export async function waitForMcpInit(): Promise<void> {
  if (_initialized) return
  if (_initPromise) await _initPromise
}

/** Get a connection by server name. Returns undefined if not connected. */
export function getMcpConnection(serverName: string): ConnectedMCPServer | undefined {
  const conn = _connections.get(serverName)
  if (conn?.type === 'connected') return conn
  return undefined
}

/** Get all current connections */
export function getAllMcpConnections(): Map<string, MCPServerConnection> {
  return _connections
}

/** Get cached tool list for a server */
export function getMcpTools(serverName: string): McpToolInfo[] {
  return _tools.get(serverName) ?? []
}

/** Get all cached tools across all servers */
export function getAllMcpTools(): McpToolInfo[] {
  return Array.from(_tools.values()).flat()
}

/** Get cached resources for a server */
export function getMcpResources(serverName: string): McpResourceInfo[] {
  return _resources.get(serverName) ?? []
}

/** Get all cached resources across all servers */
export function getAllMcpResources(): McpResourceInfo[] {
  return Array.from(_resources.values()).flat()
}

/** Add a server connection at runtime (after init) */
export async function addMcpConnection(
  serverName: string,
  config: McpServerConfig,
): Promise<MCPServerConnection> {
  const scopedConfig: ScopedMcpServerConfig = { ...config, scope: 'session' }
  const conn = await connectToMcpServer(serverName, scopedConfig)
  _connections.set(serverName, conn)

  if (conn.type === 'connected') {
    const [tools, resources] = await Promise.all([
      fetchToolsForClient(conn),
      fetchResourcesForClient(conn),
    ])
    _tools.set(serverName, tools)
    _resources.set(serverName, resources)
  }

  return conn
}

/** Remove and disconnect a server */
export async function removeMcpConnection(serverName: string): Promise<void> {
  const conn = _connections.get(serverName)
  if (conn?.type === 'connected') {
    await conn.cleanup().catch(logError)
  }
  _connections.delete(serverName)
  _tools.delete(serverName)
  _resources.delete(serverName)
}

/** Reconnect a failed server */
export async function reconnectMcpServer(serverName: string): Promise<boolean> {
  const existing = _connections.get(serverName)
  if (!existing) return false

  if (existing.type === 'connected') {
    await existing.cleanup().catch(logError)
  }

  const conn = await connectToMcpServer(serverName, existing.config)
  _connections.set(serverName, conn)

  if (conn.type === 'connected') {
    const [tools, resources] = await Promise.all([
      fetchToolsForClient(conn),
      fetchResourcesForClient(conn),
    ])
    _tools.set(serverName, tools)
    _resources.set(serverName, resources)
    return true
  }

  return false
}

/** Shutdown all connections */
export async function shutdownMcpConnections(): Promise<void> {
  const disconnects = Array.from(_connections.values())
    .filter((c): c is ConnectedMCPServer => c.type === 'connected')
    .map(c => c.cleanup().catch(logError))

  await Promise.allSettled(disconnects)
  _connections.clear()
  _tools.clear()
  _resources.clear()
  _initialized = false
  _initPromise = null
  logDebug('All MCP connections shut down')
}

/** Format a human-readable status table for /mcp command */
export async function getMcpStatus(): Promise<Array<{
  name: string
  transport: string
  status: 'connected' | 'failed' | 'pending'
  toolCount: number
  error?: string
  serverInfo?: { name: string; version: string }
}>> {
  await waitForMcpInit()

  return Array.from(_connections.entries()).map(([name, conn]) => ({
    name,
    transport: (conn.config as { type?: string }).type ?? 'stdio',
    status: conn.type === 'connected' ? 'connected' : conn.type === 'failed' ? 'failed' : 'pending',
    toolCount: _tools.get(name)?.length ?? 0,
    error: conn.type === 'failed' ? conn.error : undefined,
    serverInfo: conn.type === 'connected' ? conn.serverInfo : undefined,
  }))
}

/** Format status string for /mcp command display */
export function formatMcpStatus(statuses: Awaited<ReturnType<typeof getMcpStatus>>): string {
  if (statuses.length === 0) return '没有配置 MCP 服务器。\n在 settings.json 的 mcpServers 中添加。'

  const lines = ['**MCP 服务器状态**', '']
  for (const s of statuses) {
    const icon = s.status === 'connected' ? '✅' : s.status === 'failed' ? '❌' : '⏳'
    const info = s.serverInfo ? ` (${s.serverInfo.name} ${s.serverInfo.version})` : ''
    const toolInfo = s.status === 'connected' ? ` | ${s.toolCount} 个工具` : ''
    const errInfo = s.error ? `\n   错误: ${s.error}` : ''
    lines.push(`${icon} **${s.name}** [${s.transport}]${info}${toolInfo}${errInfo}`)
  }
  return lines.join('\n')
}

/** Re-export addMcpServer/removeMcpServer for backwards compatibility with /mcp command */
export async function addMcpServer(name: string, command: string, args: string[], cwd: string): Promise<void> {
  const { writeFileSync, readFileSync, existsSync, mkdirSync } = await import('node:fs')
  const { join } = await import('node:path')

  const settingsDir = join(cwd, '.qiling')
  const settingsPath = join(settingsDir, 'settings.json')
  mkdirSync(settingsDir, { recursive: true })

  const existing = existsSync(settingsPath)
    ? JSON.parse(readFileSync(settingsPath, 'utf-8')) as Record<string, unknown>
    : {}

  const mcpServers = (existing.mcpServers as Record<string, unknown>) ?? {}
  mcpServers[name] = { command, args }
  writeFileSync(settingsPath, JSON.stringify({ ...existing, mcpServers }, null, 2) + '\n', 'utf-8')

  // Also connect immediately
  await addMcpConnection(name, { command, args })
}

export async function removeMcpServer(name: string, cwd: string): Promise<void> {
  const { writeFileSync, readFileSync, existsSync } = await import('node:fs')
  const { join } = await import('node:path')

  const settingsPath = join(cwd, '.qiling', 'settings.json')
  if (existsSync(settingsPath)) {
    const existing = JSON.parse(readFileSync(settingsPath, 'utf-8')) as Record<string, unknown>
    const mcpServers = (existing.mcpServers as Record<string, unknown>) ?? {}
    delete mcpServers[name]
    writeFileSync(settingsPath, JSON.stringify({ ...existing, mcpServers }, null, 2) + '\n', 'utf-8')
  }

  await removeMcpConnection(name)
}
