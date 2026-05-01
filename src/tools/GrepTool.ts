import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, ToolDefinition } from '../types/tool'

const inputSchema = z.object({
  pattern: z.string().describe('Regular expression pattern to search for'),
  path: z.string().optional().describe('File or directory to search in'),
  glob: z.string().optional().describe('Glob pattern to filter files (e.g., "*.ts")'),
  output_mode: z.enum(['content', 'files_with_matches', 'count']).default('content'),
  case_insensitive: z.boolean().default(false),
  context_lines: z.number().int().optional().describe('Lines of context around matches'),
})

type Input = z.infer<typeof inputSchema>

export const GrepTool: Tool<Input> = {
  name: 'Grep',
  description:
    'Search file contents using regular expressions (powered by ripgrep). ' +
    'Output modes: "content" shows matching lines, "files_with_matches" shows file paths, "count" shows match counts. ' +
    'Much faster than shell grep for large codebases.',
  inputSchema,

  async call(input: Input, context: ToolContext): Promise<ToolResult> {
    // Try to find ripgrep
    const rgPath = await findRipgrep()
    if (!rgPath) {
      return fallbackGrep(input, context)
    }

    const args: string[] = ['--no-heading']

    if (input.case_insensitive) args.push('-i')
    if (input.glob) args.push('--glob', input.glob)
    if (input.context_lines) args.push(`-C${input.context_lines}`)

    if (input.output_mode === 'files_with_matches') {
      args.push('-l')
    } else if (input.output_mode === 'count') {
      args.push('-c')
    } else {
      args.push('-n') // line numbers
    }

    args.push(input.pattern)

    const searchPath = input.path ? input.path : '.'

    try {
      const proc = Bun.spawn([rgPath, ...args, searchPath], {
        cwd: context.workingDir,
        stdout: 'pipe',
        stderr: 'pipe',
      })

      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ])

      // rg exits with 1 when no matches (not an error)
      if (exitCode > 1) {
        return {
          content: [{ type: 'text', text: `Grep error: ${stderr}` }],
          isError: true,
        }
      }

      if (!stdout.trim()) {
        return {
          content: [{ type: 'text', text: `No matches found for pattern: ${input.pattern}` }],
        }
      }

      return {
        content: [{ type: 'text', text: stdout }],
      }
    } catch (error) {
      return fallbackGrep(input, context)
    }
  },

  toDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Regex pattern to search for' },
          path: { type: 'string', description: 'File or directory to search' },
          glob: { type: 'string', description: 'File filter glob pattern' },
          output_mode: { type: 'string', enum: ['content', 'files_with_matches', 'count'] },
          case_insensitive: { type: 'boolean', default: false },
          context_lines: { type: 'integer', description: 'Context lines around matches' },
        },
        required: ['pattern'],
      },
    }
  },
}

async function findRipgrep(): Promise<string | null> {
  // Check common locations
  const candidates = ['rg', 'rg.exe']
  for (const candidate of candidates) {
    try {
      const proc = Bun.spawn(['which', candidate], { stdout: 'pipe', stderr: 'pipe' })
      await proc.exited
      if (proc.exitCode === 0) return candidate
    } catch {
      // Continue
    }
  }
  return null
}

async function fallbackGrep(input: Input, context: ToolContext): Promise<ToolResult> {
  // Simple Node.js fallback when ripgrep is unavailable
  const { readdirSync, statSync, readFileSync, existsSync } = await import('fs')
  const { resolve, join } = await import('path')

  const searchPath = resolve(context.workingDir, input.path ?? '.')
  const regex = new RegExp(input.pattern, input.case_insensitive ? 'gi' : 'g')
  const matches: string[] = []

  function searchFile(filePath: string): void {
    try {
      const content = readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          matches.push(`${filePath}:${i + 1}:${lines[i]}`)
          regex.lastIndex = 0
        }
        regex.lastIndex = 0
      }
    } catch {
      // Skip unreadable files
    }
  }

  function searchDir(dirPath: string, depth = 0): void {
    if (depth > 10) return
    try {
      const entries = readdirSync(dirPath)
      for (const entry of entries) {
        if (['node_modules', '.git', 'dist'].includes(entry)) continue
        const full = join(dirPath, entry)
        const stat = statSync(full)
        if (stat.isDirectory()) {
          searchDir(full, depth + 1)
        } else if (stat.isFile()) {
          if (!input.glob || matchGlob(input.glob, entry)) {
            searchFile(full)
          }
        }
      }
    } catch {
      // Skip unreadable directories
    }
  }

  if (existsSync(searchPath)) {
    const stat = statSync(searchPath)
    if (stat.isFile()) {
      searchFile(searchPath)
    } else {
      searchDir(searchPath)
    }
  }

  if (matches.length === 0) {
    return { content: [{ type: 'text', text: `No matches found for: ${input.pattern}` }] }
  }
  return { content: [{ type: 'text', text: matches.slice(0, 500).join('\n') }] }
}

function matchGlob(glob: string, filename: string): boolean {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`).test(filename)
}
