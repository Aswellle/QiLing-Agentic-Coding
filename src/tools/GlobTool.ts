import { z } from 'zod'
import fg from 'fast-glob'
import { resolve, join, dirname } from 'path'
import { existsSync, readFileSync } from 'fs'
import type { Tool, ToolResult, ToolContext, ToolDefinition } from '../types/tool'
import { filterGeneratedFiles } from '../utils/generatedFiles'

const DEFAULT_HEAD_LIMIT_GLOB = 250

const inputSchema = z.object({
  pattern: z.string().describe('Glob pattern to match files (e.g., "**/*.ts", "src/**/*.{js,ts}")'),
  path: z.string().optional().describe('Directory to search in (defaults to working directory)'),
  head_limit: z.number().optional().describe('Limit output to first N files (default: 250, 0=unlimited). Use to avoid context bloat on large repos.'),
  offset: z.number().optional().describe('Skip first N files before applying head_limit, for pagination (default: 0).'),
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
  description: `- Fast file pattern matching tool that works with any codebase size
- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns matching file paths sorted by modification time
- Use this tool when you need to find files by name patterns
- When you are doing an open ended search that may require multiple rounds of globbing and grepping, use the Agent tool instead`,
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

      // CC's filterGeneratedFiles: exclude lock files, minified JS, .d.ts, etc.
      const filtered = filterGeneratedFiles(files)
      filtered.sort()

      if (filtered.length === 0) {
        const skipped = files.length - filtered.length
        const msg = skipped > 0
          ? `No non-generated files found matching: ${input.pattern} (${skipped} generated files excluded)`
          : `No files found matching: ${input.pattern}`
        return { content: [{ type: 'text', text: msg }] }
      }
      const files2 = filtered  // alias for readability

      // Apply head_limit + offset pagination (CC pattern)
      const offset = input.offset ?? 0
      const limit = input.head_limit
      const effectiveLimit = limit === 0 ? undefined : (limit ?? DEFAULT_HEAD_LIMIT_GLOB)
      const paginated = effectiveLimit !== undefined
        ? files2.slice(offset, offset + effectiveLimit)
        : files2.slice(offset)
      const truncated = effectiveLimit !== undefined && files2.length > offset + effectiveLimit

      let text = paginated.join('\n')
      if (truncated) {
        text += `\n... (showing ${offset + paginated.length}/${files2.length} files — use offset/head_limit to paginate)`
      }

      return { content: [{ type: 'text', text }] }
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
          head_limit: { type: 'number', description: 'Max files to return (default: 250, 0=unlimited)' },
          offset: { type: 'number', description: 'Skip first N files for pagination (default: 0)' },
        },
        required: ['pattern'],
      },
    }
  },
}
