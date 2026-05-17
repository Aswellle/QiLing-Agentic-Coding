/**
 * Read MCP Resource — upgraded to use services/mcp/manager and SDK client
 */

import { z } from 'zod'
import path from 'path'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'
import { getMcpConnection, waitForMcpInit } from '../services/mcp/manager'
import { ReadResourceResultSchema } from '@modelcontextprotocol/sdk/types.js'

const MAX_TEXT_BYTES = 100_000

const inputSchema = z.object({
  server: z.string().describe('Name of the MCP server that owns this resource'),
  uri: z.string().describe('Resource URI from ListMcpResources (e.g. "file:///path/to/file")'),
})

type Input = z.infer<typeof inputSchema>

function inferExtension(mimeType: string | undefined): string {
  if (!mimeType) return '.bin'
  const map: Record<string, string> = {
    'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif',
    'image/webp': '.webp', 'application/pdf': '.pdf',
    'application/zip': '.zip', 'audio/mpeg': '.mp3',
  }
  return map[mimeType] ?? '.bin'
}

export const ReadMcpResourceTool: Tool<Input> = {
  name: 'ReadMcpResource',

  description:
    'Read the contents of a specific MCP resource by URI. ' +
    'Text resources are returned inline. Binary resources (images, PDFs) are saved to a ' +
    'temporary file and the path is returned — use FileRead to inspect them further. ' +
    'Get URIs from ListMcpResources first.',

  inputSchema,

  checkPermissions(): PermissionDecision { return { type: 'allow' } },

  async call(input: Input, ctx: ToolContext): Promise<ToolResult> {
    await waitForMcpInit()
    const conn = getMcpConnection(input.server)
    if (!conn) {
      return {
        content: [{ type: 'text', text: `Error: MCP server '${input.server}' not found or not connected.` }],
        isError: true,
      }
    }

    let result: Awaited<ReturnType<typeof conn.client.request>>
    try {
      result = await conn.client.request(
        { method: 'resources/read', params: { uri: input.uri } },
        ReadResourceResultSchema,
      )
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error reading resource: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      }
    }

    const contents = result.contents ?? []
    if (contents.length === 0) {
      return { content: [{ type: 'text', text: `Resource '${input.uri}' returned no content.` }] }
    }

    const parts: string[] = []

    for (const item of contents) {
      if ('text' in item && item.text !== undefined) {
        const text = String(item.text)
        if (text.length > MAX_TEXT_BYTES) {
          parts.push(
            `[${(item as { mimeType?: string }).mimeType ?? 'text'} — truncated to ${MAX_TEXT_BYTES} chars]\n` +
            text.slice(0, MAX_TEXT_BYTES) + '\n…'
          )
        } else {
          parts.push(text)
        }
      } else if ('blob' in item && item.blob !== undefined) {
        const mimeType = (item as { mimeType?: string }).mimeType
        const ext = inferExtension(mimeType)
        const tmpPath = path.join(ctx.workingDir, `.qiling-resource-${Date.now()}${ext}`)
        const bytes = Buffer.from(String(item.blob), 'base64')
        await Bun.write(tmpPath, bytes)
        parts.push(`[Binary ${mimeType ?? 'data'} saved to: ${tmpPath}]`)
      }
    }

    return {
      content: [{ type: 'text', text: parts.join('\n\n') || `Resource '${input.uri}' returned no readable content.` }],
    }
  },

  toDefinition() {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object' as const,
        properties: {
          server: { type: 'string', description: 'MCP server name' },
          uri: { type: 'string', description: 'Resource URI' },
        },
        required: ['server', 'uri'],
      },
    }
  },
}
