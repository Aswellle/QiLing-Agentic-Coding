import { z } from 'zod'
import fg from 'fast-glob'
import { resolve, join, dirname } from 'path'
import { existsSync, readFileSync } from 'fs'
import type { Tool, ToolResult, ToolContext, ToolDefinition } from '../types/tool'

const inputSchema = z.object({
  pattern: z.string().describe('Glob pattern to match files (e.g., "**/*.ts", "src/**/*.{js,ts}")'),
  path: z.string().optional().describe('Directory to search in (defaults to working directory)'),
})

type Input = z.infer<typeof inputSchema>

const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/.next/**',
  '**/__pycache__/**',
  '**/.pytest_cache/**',
  '**/target/**',
  '**/.cargo/**',
  '**/build/**',
  '**/.gradle/**',
]

/**
 * Read and parse .gitignore patterns from a directory (and its parents up to root).
 * Returns fast-glob compatible negation patterns.
 */
function loadGitignorePatterns(startDir: string): string[] {
  const patterns: string[] = []
  let dir = startDir
  const visited = new Set<string>()

  while (!visited.has(dir)) {
    visited.add(dir)
    const gitignorePath = join(dir, '.gitignore')
    if (existsSync(gitignorePath)) {
      try {
        const lines = readFileSync(gitignorePath, 'utf-8').split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) continue
          // Convert .gitignore pattern to fast-glob ignore pattern
          const globPattern = trimmed.endsWith('/')
            ? `**/${trimmed}**`
            : trimmed.includes('/')
              ? trimmed
              : `**/${trimmed}/**`
          patterns.push(globPattern)
          // Also add direct match
          if (!trimmed.includes('/') && !trimmed.includes('*')) {
            patterns.push(`**/${trimmed}`)
          }
        }
      } catch { /* skip unreadable .gitignore */ }
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }

  return patterns
}

export const GlobTool: Tool<Input> = {
  name: 'Glob',
  description:
    'Find files matching a glob pattern. Returns sorted list of matching file paths. ' +
    'Supports patterns like "**/*.ts", "src/**/*.{js,ts}", "*.json". ' +
    'Automatically respects .gitignore and ignores node_modules, .git, dist.',
  inputSchema,

  async call(input: Input, context: ToolContext): Promise<ToolResult> {
    const searchDir = input.path
      ? resolve(context.workingDir, input.path)
      : context.workingDir

    const gitignorePatterns = loadGitignorePatterns(searchDir)
    const ignore = [...DEFAULT_IGNORE, ...gitignorePatterns]

    try {
      const files = await fg(input.pattern, {
        cwd: searchDir,
        ignore,
        dot: false,
        onlyFiles: true,
        followSymbolicLinks: false,
      })

      files.sort()

      if (files.length === 0) {
        return {
          content: [{ type: 'text', text: `No files found matching: ${input.pattern}` }],
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

  isConcurrencySafe: () => true,

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
