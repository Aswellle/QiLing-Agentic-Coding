import { z } from 'zod'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import type { Tool, ToolResult, ToolContext, ToolDefinition, PermissionDecision } from '../types/tool'
import { backupFile } from '../utils/fileHistory'

// CC's writeTextContent: detect and preserve CRLF line endings from existing files
function detectCRLF(filePath: string): boolean {
  try {
    const sample = readFileSync(filePath, 'utf-8').slice(0, 4096)
    return sample.includes('\r\n')
  } catch { return false }
}

function normalizeLineEndings(content: string, useCRLF: boolean): string {
  if (!useCRLF) return content
  // Normalize to LF first (prevent double CRLF), then convert to CRLF
  return content.replaceAll('\r\n', '\n').split('\n').join('\r\n')
}

const inputSchema = z.object({
  file_path: z.string().describe('Path to the file to write'),
  content: z.string().describe('The content to write to the file'),
})

type Input = z.infer<typeof inputSchema>

export const FileWriteTool: Tool<Input> = {
  name: 'FileWrite',
  description:
    'Write content to a file, creating it if it does not exist. ' +
    'Creates parent directories automatically. ' +
    'Overwrites existing files. ' +
    'Prefer FileEdit for modifying existing files; use FileWrite for new files or complete rewrites.',
  inputSchema,

  checkPermissions(input: Input): PermissionDecision {
    if (existsSync(input.file_path)) {
      return { type: 'ask', description: `Overwrite existing file: ${input.file_path}` }
    }
    return { type: 'allow' }
  },

  async call(input: Input, context: ToolContext): Promise<ToolResult> {
    const filePath = resolve(context.workingDir, input.file_path)
    const dir = dirname(filePath)

    // Backup before overwriting (no-op if file is new or already backed up this session)
    await backupFile(filePath, context.workingDir)

    mkdirSync(dir, { recursive: true })
    // CC's writeTextContent: preserve CRLF line endings from existing files (Windows compat)
    const useCRLF = existsSync(filePath) && detectCRLF(filePath)
    const contentToWrite = normalizeLineEndings(input.content, useCRLF)
    writeFileSync(filePath, contentToWrite, 'utf-8')

    const lineCount = input.content.split('\n').length
    return {
      content: [{
        type: 'text',
        text: `Successfully wrote ${lineCount} lines to ${input.file_path}.`,
      }],
    }
  },

  toDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Path to write the file to' },
          content: { type: 'string', description: 'Content to write' },
        },
        required: ['file_path', 'content'],
      },
    }
  },
}
