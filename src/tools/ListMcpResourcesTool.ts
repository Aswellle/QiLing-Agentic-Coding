import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'
import { getRegisteredMcpClient, listRegisteredMcpServers } from './McpTool'

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
    const servers = input.server
      ? [input.server]
      : listRegisteredMcpServers()

    if (servers.length === 0) {
      return {
        content: [{ type: 'text', text: 'No MCP servers connected. Configure mcpServers in .qiling/settings.json.' }],
      }
    }

    const allResources: Array<{
      server: string; uri: string; name: string; description?: string; mimeType?: string
    }> = []
    const errors: string[] = []

    for (const serverName of servers) {
      const client = getRegisteredMcpClient(serverName)
      if (!client) {
        errors.push(`Server '${serverName}' not found or not connected`)
        continue
      }
      try {
        const resources = await client.listResources()
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
      lines.push('', 'Errors:')
      errors.forEach(e => lines.push(`  ✗ ${e}`))
    }

    return {
      content: [{ type: 'text', text: lines.join('\n') + '\n\n' + JSON.stringify({ resources: allResources }) }],
    }
  },

  toDefinition() {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object' as const,
        properties: {
          server: { type: 'string', description: 'Filter to a specific server name (optional)' },
        },
        required: [],
      },
    }
  },
}
