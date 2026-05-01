/**
 * MCP (Model Context Protocol) Tool Bridge
 *
 * Connects to external MCP servers and exposes their tools as QiLing tools.
 * Supports stdio and SSE transport types.
 */
import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, ToolDefinition } from '../types/tool'

interface McpServerConfig {
  name: string
  transport: 'stdio' | 'sse'
  command?: string    // for stdio: command to run
  args?: string[]     // for stdio: command args
  url?: string        // for sse: server URL
  env?: Record<string, string>
}

interface McpToolInfo {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

interface McpClient {
  listTools(): Promise<McpToolInfo[]>
  callTool(name: string, args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text?: string }> }>
  close(): Promise<void>
}

/** Simple stdio MCP client using line-delimited JSON-RPC */
class StdioMcpClient implements McpClient {
  private proc: ReturnType<typeof Bun.spawn> | null = null
  private nextId = 1
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
  private buffer = ''
  private ready = false

  constructor(private config: McpServerConfig) {}

  async connect(): Promise<void> {
    const { command, args = [], env } = this.config
    if (!command) throw new Error('stdio MCP requires command')

    this.proc = Bun.spawn([command, ...args], {
      env: { ...process.env, ...env },
      stdout: 'pipe',
      stdin: 'pipe',
      stderr: 'pipe',
    })

    // Read stdout in background
    this.readLoop()

    // Send initialize
    await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'qiling', version: '0.1.0' },
    })

    // Send initialized notification
    this.notify('notifications/initialized', {})
    this.ready = true
  }

  private async readLoop(): Promise<void> {
    const stdout = this.proc!.stdout as ReadableStream<Uint8Array>
    const reader = stdout.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      this.buffer += decoder.decode(value)
      const lines = this.buffer.split('\n')
      this.buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const msg = JSON.parse(line) as {
            id?: number;
            result?: unknown;
            error?: { message: string };
          }
          if (msg.id !== undefined) {
            const handler = this.pending.get(msg.id)
            if (handler) {
              this.pending.delete(msg.id)
              if (msg.error) {
                handler.reject(new Error(msg.error.message))
              } else {
                handler.resolve(msg.result)
              }
            }
          }
        } catch { /* ignore parse errors */ }
      }
    }
  }

  private request(method: string, params: unknown): Promise<unknown> {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      const msg = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'
      const stdin = this.proc!.stdin as import('bun').FileSink
      stdin.write(msg)
    })
  }

  private notify(method: string, params: unknown): void {
    const msg = JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n'
    const stdin = this.proc!.stdin as import('bun').FileSink
    stdin.write(msg)
  }

  async listTools(): Promise<McpToolInfo[]> {
    const result = await this.request('tools/list', {}) as { tools: McpToolInfo[] }
    return result.tools ?? []
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text?: string }> }> {
    const result = await this.request('tools/call', { name, arguments: args }) as {
      content: Array<{ type: string; text?: string }>
    }
    return result
  }

  async close(): Promise<void> {
    this.proc?.kill()
  }
}

/** SSE-based MCP client (for HTTP server-sent events transport) */
class SseMcpClient implements McpClient {
  private sessionUrl: string | null = null
  private nextId = 1
  private config: McpServerConfig

  constructor(config: McpServerConfig) {
    this.config = config
  }

  async connect(): Promise<void> {
    // POST to /mcp endpoint to initialize session
    const initResponse = await fetch(this.config.url!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: this.nextId++, method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'qiling', version: '0.1.0' },
        },
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!initResponse.ok) {
      throw new Error(`MCP SSE init failed: ${initResponse.status} ${await initResponse.text()}`)
    }

    const location = initResponse.headers.get('location')
    this.sessionUrl = location ?? this.config.url!

    // Send initialized notification
    await fetch(this.sessionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }),
    }).catch(() => {})
  }

  private async rpc(method: string, params: unknown): Promise<unknown> {
    const id = this.nextId++
    const response = await fetch(this.sessionUrl ?? this.config.url!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) {
      throw new Error(`MCP RPC failed: ${response.status}`)
    }

    const text = await response.text()

    // Handle SSE-wrapped response
    if (text.startsWith('data:')) {
      const line = text.split('\n').find(l => l.startsWith('data:'))
      if (line) {
        const data = JSON.parse(line.slice(5)) as { result?: unknown; error?: { message: string } }
        if (data.error) throw new Error(data.error.message)
        return data.result
      }
    }

    const data = JSON.parse(text) as { result?: unknown; error?: { message: string } }
    if (data.error) throw new Error(data.error.message)
    return data.result
  }

  async listTools(): Promise<McpToolInfo[]> {
    const result = await this.rpc('tools/list', {}) as { tools: McpToolInfo[] }
    return result.tools ?? []
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text?: string }> }> {
    return this.rpc('tools/call', { name, arguments: args }) as Promise<{ content: Array<{ type: string; text?: string }> }>
  }

  async close(): Promise<void> {
    // SSE sessions are closed server-side via timeout
  }
}

/** Create QiLing Tool wrappers for all tools from an MCP server */
export async function loadMcpTools(config: McpServerConfig): Promise<Tool[]> {
  let client: McpClient

  if (config.transport === 'stdio') {
    const stdioClient = new StdioMcpClient(config)
    await stdioClient.connect()
    client = stdioClient
  } else if (config.transport === 'sse') {
    if (!config.url) throw new Error('SSE MCP transport requires url')
    const sseClient = new SseMcpClient(config)
    await sseClient.connect()
    client = sseClient
  } else {
    throw new Error(`Unknown MCP transport: ${(config as { transport: string }).transport}`)
  }

  const mcpTools = await client.listTools()
  const qilingTools: Tool[] = []

  for (const mcpTool of mcpTools) {
    const toolName = `mcp__${config.name}__${mcpTool.name}`

    const tool: Tool<Record<string, unknown>> = {
      name: toolName,
      description: `[MCP: ${config.name}] ${mcpTool.description}`,
      inputSchema: z.record(z.unknown()),

      async call(input: Record<string, unknown>, _ctx: ToolContext): Promise<ToolResult> {
        try {
          const result = await client.callTool(mcpTool.name, input)
          const text = result.content
            .filter(c => c.type === 'text')
            .map(c => c.text ?? '')
            .join('\n')
          return { content: [{ type: 'text', text }] }
        } catch (error) {
          return {
            content: [{ type: 'text', text: `MCP tool error: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true,
          }
        }
      },

      toDefinition(): ToolDefinition {
        return {
          name: toolName,
          description: tool.description,
          input_schema: mcpTool.inputSchema,
        }
      },
    }

    qilingTools.push(tool)
  }

  return qilingTools
}

/** Load MCP server configs from settings */
export interface McpConfig {
  mcpServers?: Record<string, {
    command?: string
    args?: string[]
    url?: string
    env?: Record<string, string>
  }>
}

export async function loadAllMcpTools(mcpConfig: McpConfig): Promise<Tool[]> {
  if (!mcpConfig.mcpServers) return []

  const allTools: Tool[] = []

  for (const [name, serverConfig] of Object.entries(mcpConfig.mcpServers)) {
    try {
      const transport = serverConfig.command ? 'stdio' : 'sse'
      const tools = await loadMcpTools({
        name,
        transport: transport as 'stdio' | 'sse',
        command: serverConfig.command,
        args: serverConfig.args,
        url: serverConfig.url,
        env: serverConfig.env,
      })
      allTools.push(...tools)
    } catch (error) {
      console.error(`Failed to load MCP server "${name}": ${error instanceof Error ? error.message : error}`)
    }
  }

  return allTools
}
