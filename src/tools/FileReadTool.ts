import { z } from 'zod'
import { readFileSync, existsSync, statSync } from 'fs'
import { resolve } from 'path'
import type { Tool, ToolResult, ToolContext, ToolDefinition } from '../types/tool'

const inputSchema = z.object({
  file_path: z.string().describe('Absolute or relative path to the file to read'),
  offset: z.number().int().optional().describe('Line number to start reading from (1-indexed)'),
  limit: z.number().int().optional().describe('Maximum number of lines to read'),
})

type Input = z.infer<typeof inputSchema>

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const DEFAULT_LINE_LIMIT = 2000

export const FileReadTool: Tool<Input> = {
  name: 'FileRead',
  description:
    'Read the contents of a file. Returns the file content with line numbers. ' +
    'Supports text files and images (returns base64 for images). ' +
    'Use offset and limit to read specific sections of large files.',
  inputSchema,

  async call(input: Input, context: ToolContext): Promise<ToolResult> {
    const filePath = resolve(context.workingDir, input.file_path)

    if (!existsSync(filePath)) {
      return {
        content: [{ type: 'text', text: `File not found: ${input.file_path}` }],
        isError: true,
      }
    }

    const stat = statSync(filePath)

    if (stat.size > MAX_FILE_SIZE) {
      return {
        content: [{ type: 'text', text: `File too large (${stat.size} bytes). Maximum is ${MAX_FILE_SIZE} bytes.` }],
        isError: true,
      }
    }

    // Check if it's an image
    const ext = filePath.toLowerCase().split('.').pop() ?? ''
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
      const data = readFileSync(filePath).toString('base64')
      const mimeTypes: Record<string, string> = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        gif: 'image/gif', webp: 'image/webp',
      }
      return {
        content: [{ type: 'text', text: `[Image: ${input.file_path}]\nbase64:${mimeTypes[ext] ?? 'image/png'}:${data}` }],
      }
    }

    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    const offset = (input.offset ?? 1) - 1 // Convert to 0-indexed
    const limit = input.limit ?? DEFAULT_LINE_LIMIT

    const selectedLines = lines.slice(offset, offset + limit)
    const numbered = selectedLines
      .map((line, i) => `${String(i + offset + 1).padStart(4)}\t${line}`)
      .join('\n')

    const truncated = lines.length > offset + limit
    const footer = truncated
      ? `\n[File truncated. Showing lines ${offset + 1}-${offset + limit} of ${lines.length}. Use offset/limit to read more.]`
      : ''

    return {
      content: [{ type: 'text', text: numbered + footer }],
    }
  },

  isConcurrencySafe: () => true,

  toDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Path to the file to read' },
          offset: { type: 'integer', description: 'Line number to start reading from (1-indexed)' },
          limit: { type: 'integer', description: 'Maximum number of lines to read' },
        },
        required: ['file_path'],
      },
    }
  },
}
