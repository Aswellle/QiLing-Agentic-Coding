import { z } from 'zod'
import path from 'path'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'
import { getRegisteredMcpClient } from './McpTool'

const MAX_TEXT_BYTES = 100_000  // 100 KB text inline limit

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
    const client = getRegisteredMcpClient(input.server)
    if (!client) {
      return {
        content: [{ type: 'text', text: `Error: MCP server '${input.server}' not found or not connected.` }],
        isError: true,
      }
    }

    let contents
    try {
      contents = await client.readResource(input.uri)
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error reading resource: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      }
    }

    if (contents.length === 0) {
      return { content: [{ type: 'text', text: `Resource '${input.uri}' returned no content.` }] }
    }

    const parts: string[] = []

    for (const item of contents) {
      if (item.text !== undefined) {
        // Text content — inline, truncated if huge
        const text = item.text
        if (text.length > MAX_TEXT_BYTES) {
          parts.push(
            `[${item.mimeType ?? 'text'} — truncated to ${MAX_TEXT_BYTES} chars]\n` +
            text.slice(0, MAX_TEXT_BYTES) + '\n…'
          )
        } else {
          parts.push(item.text)
        }
      } else if (item.blob !== undefined) {
        // Binary — save to temp file
        const ext = inferExtension(item.mimeType)
        const tmpPath = path.join(ctx.workingDir, `.qiling-resource-${Date.now()}${ext}`)
        const bytes = Buffer.from(item.blob, 'base64')
        await Bun.write(tmpPath, bytes)
        parts.push(
          `[Binary resource saved to: ${tmpPath}]\n` +
          `Size: ${bytes.length} bytes, MIME: ${item.mimeType ?? 'unknown'}`
        )
      }
    }

    return {
      content: [{ type: 'text', text: parts.join('\n\n---\n\n') }],
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
          uri: { type: 'string', description: 'Resource URI from ListMcpResources' },
        },
        required: ['server', 'uri'],
      },
    }
  },
}
