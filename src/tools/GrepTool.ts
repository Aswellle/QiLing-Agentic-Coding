/**
 * Grep tool — CC-aligned version with full parameter parity
 *
 * New vs old:
 *  - head_limit/offset  (CC's pagination for large result sets)
 *  - -A/-B/-C context   (lines before/after match)
 *  - -n line numbers    (default true for content mode)
 *  - -i case-insensitive
 *  - --type <lang>      (rg --type for language-aware filtering)
 *  - multiline          (rg -U --multiline-dotall)
 *  - output_mode default changed to "files_with_matches" (matches CC)
 *
 * CC param names preserved verbatim so AI prompts transfer across tools.
 */

import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, ToolDefinition } from '../types/tool'

const DEFAULT_HEAD_LIMIT = 250

const inputSchema = z.object({
  pattern: z.string().describe('The regular expression pattern to search for in file contents'),
  path: z.string().optional().describe('File or directory to search in (rg PATH). Defaults to current working directory.'),
  glob: z.string().optional().describe('Glob pattern to filter files (e.g. "*.js", "*.{ts,tsx}") - maps to rg --glob'),
  output_mode: z
    .enum(['content', 'files_with_matches', 'count'])
    .optional()
    .describe('Output mode: "content" shows matching lines (supports -A/-B/-C context, -n line numbers, head_limit), "files_with_matches" shows file paths (supports head_limit), "count" shows match counts (supports head_limit). Defaults to "files_with_matches".'),
  '-B': z.number().optional().describe('Number of lines to show before each match (rg -B). Requires output_mode: "content", ignored otherwise.'),
  '-A': z.number().optional().describe('Number of lines to show after each match (rg -A). Requires output_mode: "content", ignored otherwise.'),
  '-C': z.number().optional().describe('Alias for context.'),
  context: z.number().optional().describe('Number of lines to show before and after each match (rg -C). Requires output_mode: "content", ignored otherwise.'),
  '-n': z.boolean().optional().describe('Show line numbers in output (rg -n). Requires output_mode: "content", ignored otherwise. Defaults to true.'),
  '-i': z.boolean().optional().describe('Case insensitive search (rg -i)'),
  type: z.string().optional().describe('File type to search (rg --type). Common types: js, py, rust, go, java, etc.'),
  head_limit: z.number().optional().describe('Limit output to first N lines/entries, equivalent to "| head -N". Works across all output modes. Defaults to 250 when unspecified. Pass 0 for unlimited (use sparingly — large result sets waste context).'),
  offset: z.number().optional().describe('Skip first N lines/entries before applying head_limit, equivalent to "| tail -n +N | head -N". Works across all output modes. Defaults to 0.'),
  multiline: z.boolean().optional().describe('Enable multiline mode where . matches newlines and patterns can span lines (rg -U --multiline-dotall). Default: false.'),
})

type Input = z.infer<typeof inputSchema>

function applyHeadLimit<T>(items: T[], limit: number | undefined, offset = 0): { items: T[]; truncated: boolean } {
  const start = offset
  if (limit === 0) return { items: items.slice(start), truncated: false }
  const effective = limit ?? DEFAULT_HEAD_LIMIT
  const sliced = items.slice(start, start + effective)
  return { items: sliced, truncated: items.length > start + effective }
}

export const GrepTool: Tool<Input> = {
  name: 'Grep',
  description: `A powerful search tool built on ripgrep

  Usage:
  - ALWAYS use Grep for search tasks. NEVER invoke \`grep\` or \`rg\` as a Bash command.
  - Supports full regex syntax (e.g., "log.*Error", "function\\s+\\w+")
  - Filter files with glob parameter (e.g., "*.js", "**/*.tsx") or type parameter (e.g., "js", "py", "rust")
  - Output modes: "content" shows matching lines, "files_with_matches" shows only file paths (default), "count" shows match counts
  - Use Agent tool for open-ended searches requiring multiple rounds
  - Pattern syntax: Uses ripgrep (not grep) - literal braces need escaping (use \`interface\\{\\}\` to find \`interface{}\` in Go code)
  - Multiline matching: By default patterns match within single lines only. For cross-line patterns like \`struct \\{[\\s\\S]*?field\`, use \`multiline: true\`
`,
  inputSchema,
  isConcurrencySafe: () => true,

  async call(input: Input, context: ToolContext): Promise<ToolResult> {
    const rgPath = Bun.which('rg')
    if (!rgPath) return fallbackGrep(input, context)

    const outputMode = input.output_mode ?? 'files_with_matches'
    const args: string[] = []

    // Case insensitive
    if (input['-i']) args.push('-i')

    // Glob filter
    if (input.glob) args.push('--glob', input.glob)

    // File type filter
    if (input.type) args.push('--type', input.type)

    // Multiline
    if (input.multiline) args.push('-U', '--multiline-dotall')

    // Output mode
    if (outputMode === 'files_with_matches') {
      args.push('-l')
    } else if (outputMode === 'count') {
      args.push('-c')
    } else {
      // content mode: context lines + line numbers
      const contextLines = input.context ?? input['-C']
      const beforeLines = input['-B']
      const afterLines = input['-A']
      const showLineNums = input['-n'] !== false  // default true

      args.push('--no-heading', '--with-filename')
      if (showLineNums) args.push('-n')
      if (contextLines) args.push(`-C${contextLines}`)
      else {
        if (beforeLines) args.push(`-B${beforeLines}`)
        if (afterLines) args.push(`-A${afterLines}`)
      }
    }

    args.push(input.pattern)
    const searchPath = input.path ?? '.'

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

      if (exitCode > 1) {
        return { content: [{ type: 'text', text: `Grep error: ${stderr}` }], isError: true }
      }
      if (!stdout.trim()) {
        return { content: [{ type: 'text', text: `No matches found for pattern: ${input.pattern}` }] }
      }

      const lines = stdout.split('\n').filter(Boolean)
      const { items, truncated } = applyHeadLimit(lines, input.head_limit, input.offset ?? 0)
      let result = items.join('\n')
      if (truncated) {
        const shown = (input.offset ?? 0) + items.length
        result += `\n... (showing ${shown}/${lines.length} results — use offset/head_limit to paginate)`
      }

      return { content: [{ type: 'text', text: result }] }
    } catch {
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
          glob: { type: 'string', description: 'File filter glob pattern (e.g. "*.ts")' },
          output_mode: { type: 'string', enum: ['content', 'files_with_matches', 'count'], description: 'Output format (default: files_with_matches)' },
          '-B': { type: 'number', description: 'Lines before match (content mode only)' },
          '-A': { type: 'number', description: 'Lines after match (content mode only)' },
          '-C': { type: 'number', description: 'Context lines (alias for context)' },
          context: { type: 'number', description: 'Lines before and after match (content mode)' },
          '-n': { type: 'boolean', description: 'Show line numbers (default: true in content mode)' },
          '-i': { type: 'boolean', description: 'Case insensitive search' },
          type: { type: 'string', description: 'File type (rg --type): js, py, rust, go, java, etc.' },
          head_limit: { type: 'number', description: 'Max results to return (default: 250, 0=unlimited)' },
          offset: { type: 'number', description: 'Skip first N results for pagination (default: 0)' },
          multiline: { type: 'boolean', description: 'Enable multiline regex (rg -U --multiline-dotall)' },
        },
        required: ['pattern'],
      },
    }
  },
}

// ─── Fallback grep (when rg not available) ────────────────────────────────────

async function fallbackGrep(input: Input, context: ToolContext): Promise<ToolResult> {
  const { readdirSync, statSync, readFileSync, existsSync } = await import('fs')
  const { resolve, join } = await import('path')

  const outputMode = input.output_mode ?? 'files_with_matches'
  const searchPath = resolve(context.workingDir, input.path ?? '.')
  const flags = (input['-i'] ? 'gi' : 'g') + (input.multiline ? 's' : '')
  const regex = new RegExp(input.pattern, flags)
  const matchedFiles: string[] = []
  const matchedLines: string[] = []
  const countMap = new Map<string, number>()

  function searchFile(filePath: string): void {
    try {
      const content = readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')
      let fileMatched = false
      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i]!)) {
          fileMatched = true
          if (outputMode === 'content') matchedLines.push(`${filePath}:${i + 1}:${lines[i]}`)
          else if (outputMode === 'count') countMap.set(filePath, (countMap.get(filePath) ?? 0) + 1)
          regex.lastIndex = 0
        }
        regex.lastIndex = 0
      }
      if (fileMatched && outputMode === 'files_with_matches') matchedFiles.push(filePath)
    } catch { /* skip */ }
  }

  function searchDir(dir: string, depth = 0): void {
    if (depth > 10) return
    try {
      for (const entry of readdirSync(dir)) {
        if (['node_modules', '.git', 'dist', 'build', '.svn'].includes(entry)) continue
        const full = join(dir, entry)
        const stat = statSync(full)
        if (stat.isDirectory()) searchDir(full, depth + 1)
        else if (stat.isFile() && (!input.glob || matchGlob(input.glob, entry))) searchFile(full)
      }
    } catch { /* skip */ }
  }

  if (existsSync(searchPath)) {
    const stat = statSync(searchPath)
    if (stat.isFile()) searchFile(searchPath)
    else searchDir(searchPath)
  }

  const offset = input.offset ?? 0
  const limit = input.head_limit

  if (outputMode === 'files_with_matches') {
    const { items, truncated } = applyHeadLimit(matchedFiles, limit, offset)
    if (items.length === 0) return { content: [{ type: 'text', text: `No matches found.` }] }
    let text = items.join('\n')
    if (truncated) text += `\n... (${matchedFiles.length} total files)`
    return { content: [{ type: 'text', text }] }
  } else if (outputMode === 'count') {
    const entries = [...countMap.entries()].map(([f, c]) => `${f}:${c}`)
    const { items } = applyHeadLimit(entries, limit, offset)
    return { content: [{ type: 'text', text: items.join('\n') || 'No matches.' }] }
  } else {
    const { items, truncated } = applyHeadLimit(matchedLines, limit, offset)
    if (items.length === 0) return { content: [{ type: 'text', text: `No matches found.` }] }
    let text = items.join('\n')
    if (truncated) text += `\n... (${matchedLines.length} total matches)`
    return { content: [{ type: 'text', text }] }
  }
}

function matchGlob(glob: string, filename: string): boolean {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`).test(filename)
}
