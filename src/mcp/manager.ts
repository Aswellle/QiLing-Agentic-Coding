/**
 * MCP Server Manager
 * 管理 MCP 服务器的生命周期：连接、列出工具、热重载
 */
import { loadMcpTools } from '../tools/McpTool'
import { saveGlobalSettings, loadSettings } from '../settings/loader'
import type { Tool } from '../types/tool'

export interface McpServerStatus {
  name: string
  transport: 'stdio' | 'sse'
  command?: string
  url?: string
  status: 'connected' | 'error' | 'unknown'
  toolCount: number
  error?: string
}

/** Get status of all configured MCP servers without connecting */
export async function getMcpStatus(
  mcpServers: Record<string, { command?: string; args?: string[]; url?: string; env?: Record<string, string> }>
): Promise<McpServerStatus[]> {
  const statuses: McpServerStatus[] = []

  for (const [name, config] of Object.entries(mcpServers)) {
    const transport: 'stdio' | 'sse' = config.command ? 'stdio' : 'sse'
    let status: McpServerStatus = {
      name,
      transport,
      command: config.command,
      url: config.url,
      status: 'unknown',
      toolCount: 0,
    }

    try {
      const tools = await Promise.race([
        loadMcpTools({ name, transport, ...config }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5_000)),
      ])
      status = { ...status, status: 'connected', toolCount: tools.length }
    } catch (err) {
      status = {
        ...status,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      }
    }

    statuses.push(status)
  }

  return statuses
}

export function formatMcpStatus(statuses: McpServerStatus[]): string {
  if (statuses.length === 0) {
    return [
      '没有配置 MCP 服务器。',
      '',
      '添加方法（在 ~/.qiling/settings.json 中）：',
      '  {',
      '    "mcpServers": {',
      '      "filesystem": {',
      '        "command": "npx",',
      '        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"]',
      '      }',
      '    }',
      '  }',
      '',
      '或运行: /mcp add <name> <command> [args...]',
    ].join('\n')
  }

  const lines: string[] = ['MCP 服务器状态:\n']
  for (const s of statuses) {
    const icon = s.status === 'connected' ? '✅' : s.status === 'error' ? '❌' : '❓'
    const detail = s.command ?? s.url ?? ''
    const toolInfo = s.status === 'connected' ? ` (${s.toolCount} 个工具)` : ''
    const errInfo = s.error ? `\n     错误: ${s.error.slice(0, 80)}` : ''
    lines.push(`  ${icon} ${s.name.padEnd(16)} [${s.transport}] ${detail}${toolInfo}${errInfo}`)
  }
  return lines.join('\n')
}

/** Add a stdio MCP server to global settings */
export async function addMcpServer(
  name: string,
  command: string,
  args: string[],
  workingDir: string
): Promise<void> {
  const settings = loadSettings(workingDir)
  const existing = settings.mcpServers ?? {}
  existing[name] = { command, args }
  saveGlobalSettings({ mcpServers: existing })
}

/** Remove a MCP server from global settings */
export async function removeMcpServer(name: string, workingDir: string): Promise<void> {
  const settings = loadSettings(workingDir)
  const existing = { ...(settings.mcpServers ?? {}) }
  delete existing[name]
  saveGlobalSettings({ mcpServers: existing })
}

/** Load all MCP tools from configured servers (with error resilience) */
export async function loadAllMcpToolsSafe(
  mcpServers: Record<string, { command?: string; args?: string[]; url?: string; env?: Record<string, string> }>,
  onError?: (name: string, error: string) => void
): Promise<Tool[]> {
  const allTools: Tool[] = []

  for (const [name, config] of Object.entries(mcpServers)) {
    const transport: 'stdio' | 'sse' = config.command ? 'stdio' : 'sse'
    try {
      const tools = await Promise.race([
        loadMcpTools({ name, transport, ...config }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Connection timeout after 8s`)), 8_000)
        ),
      ])
      allTools.push(...tools)
    } catch (err) {
      onError?.(name, err instanceof Error ? err.message : String(err))
    }
  }

  return allTools
}
