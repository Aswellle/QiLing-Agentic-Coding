/**
 * List MCP Resources — upgraded to use services/mcp/manager
 */

import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'
import {
  getAllMcpConnections,
  getMcpResources,
  getAllMcpResources,
  waitForMcpInit,
} from '../services/mcp/manager'
import { fetchResourcesForClient } from '../services/mcp/client'
import type { ConnectedMCPServer } from '../services/mcp/types'

const inputSchema = z.object({
  server: z.string().optional().describe(
    'Filter to a specific MCP server by name. Omit to list resources from all connected servers.'
  ),
})

type Input = z.infer<typeof inputSchema>

export const ListMcpResourcesTool: Tool<Input> = {
  name: 'ListMcpResources',

  description:
    'List resources exposed by connected MCP servers. ' +
    'MCP Resources are data sources (files, URLs, database queries, API endpoints) ' +
    'that a server makes available for reading. ' +
    'After listing, use ReadMcpResource to fetch the contents of a specific resource by URI.',

  inputSchema,

  checkPermissions(): PermissionDecision { return { type: 'allow' } },

  async call(input: Input, _ctx: ToolContext): Promise<ToolResult> {
    await waitForMcpInit()
    const connections = getAllMcpConnections()

    const targetServers = input.server
      ? [input.server]
      : Array.from(connections.keys())

    if (targetServers.length === 0) {
      return {
        content: [{ type: 'text', text: 'No MCP servers connected. Configure mcpServers in .qiling/settings.json.' }],
      }
    }

    const allResources: Array<{ server: string; uri: string; name: string; description?: string; mimeType?: string }> = []
    const errors: string[] = []

    for (const serverName of targetServers) {
      const conn = connections.get(serverName)
      if (!conn || conn.type !== 'connected') {
        errors.push(`Server '${serverName}' not found or not connected`)
        continue
      }
      try {
        // Use cached resources first, then fetch live
        let resources = getMcpResources(serverName)
        if (resources.length === 0) {
          resources = await fetchResourcesForClient(conn as ConnectedMCPServer)
        }
        for (const r of resources) {
          allResources.push({ server: serverName, uri: r.uri, name: r.name, description: r.description, mimeType: r.mimeType })
        }
      } catch (err) {
        errors.push(`${serverName}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    if (allResources.length === 0 && errors.length === 0) {
      return { content: [{ type: 'text', text: 'Connected MCP servers expose no resources.' }] }
    }

    const lines: string[] = []
    if (allResources.length > 0) {
      lines.push(`${allResources.length} resource(s):`)
      for (const r of allResources) {
        lines.push(`  [${r.server}] ${r.name}`)
        lines.push(`    URI: ${r.uri}`)
        if (r.mimeType) lines.push(`    Type: ${r.mimeType}`)
        if (r.description) lines.push(`    ${r.description}`)
      }
    }
    if (errors.length > 0) {
      lines.push('', 'Errors:', ...errors.map(e => `  ${e}`))
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] }
  },

  toDefinition() {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object' as const,
        properties: {
          server: { type: 'string', description: 'Filter by server name (optional)' },
        },
        required: [],
      },
    }
  },
}
