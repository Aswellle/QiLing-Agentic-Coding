import { z } from 'zod'
import fg from 'fast-glob'
import { resolve } from 'path'
import type { Tool, ToolResult, ToolContext, ToolDefinition } from '../types/tool'

const inputSchema = z.object({
  pattern: z.string().describe('Glob pattern to match files (e.g., "**/*.ts", "src/**/*.{js,ts}")'),
  path: z.string().optional().describe('Directory to search in (defaults to current working directory)'),
})

type Input = z.infer<typeof inputSchema>

export const GlobTool: Tool<Input> = {
  name: 'Glob',
  description:
    'Find files matching a glob pattern. Returns a sorted list of matching file paths. ' +
    'Supports patterns like "**/*.ts", "src/**/*.{js,ts}", "*.json". ' +
    'Automatically ignores node_modules, .git, dist directories.',
  inputSchema,

  async call(input: Input, context: ToolContext): Promise<ToolResult> {
    const searchDir = input.path
      ? resolve(context.workingDir, input.path)
      : context.workingDir

    try {
      const files = await fg(input.pattern, {
        cwd: searchDir,
        ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/.next/**'],
        dot: false,
        onlyFiles: true,
        followSymbolicLinks: false,
      })

      files.sort()

      if (files.length === 0) {
        return {
          content: [{ type: 'text', text: `No files found matching pattern: ${input.pattern}` }],
        }
      }

      return {
        content: [{ type: 'text', text: files.join('\n') }],
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Glob error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      }
    }
  },

  toDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Glob pattern' },
          path: { type: 'string', description: 'Directory to search in' },
        },
        required: ['pattern'],
      },
    }
  },
}
