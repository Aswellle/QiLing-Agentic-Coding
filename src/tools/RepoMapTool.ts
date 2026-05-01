/**
 * RepoMap — lightweight repository symbol index (inspired by Aider's repo-map).
 *
 * Scans the project with fast-glob and extracts:
 *   - File paths grouped by type
 *   - Top-level function/class/interface signatures (regex-based, no treesitter dep)
 *   - Counts by file type
 *
 * Output is kept token-efficient: ~1-3k tokens for a medium project.
 * Used to inject context about the full repo into the system prompt without
 * loading all file contents.
 */
import { z } from 'zod'
import { readFileSync, existsSync } from 'fs'
import { resolve, relative, extname } from 'path'
import fg from 'fast-glob'
import type { Tool, ToolResult, ToolContext, ToolDefinition } from '../types/tool'

const inputSchema = z.object({
  max_tokens: z.number().int().default(2000).describe('Max tokens for the repo map output'),
  focus_path: z.string().optional().describe('Focus on a subdirectory'),
})

type Input = z.infer<typeof inputSchema>

// Regex patterns for extracting top-level symbols per language
const SYMBOL_PATTERNS: Array<{
  exts: string[]
  patterns: RegExp[]
  prefix: string
}> = [
  {
    exts: ['.ts', '.tsx', '.js', '.jsx', '.mjs'],
    patterns: [
      /^export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|type|interface|enum)\s+(\w+)/m,
      /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/m,
      /^(?:export\s+)?class\s+(\w+)/m,
      /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*[:=]/m,
      /^(?:export\s+)?(?:type|interface)\s+(\w+)/m,
    ],
    prefix: '',
  },
  {
    exts: ['.py'],
    patterns: [
      /^(?:async\s+)?def\s+(\w+)\s*\(/m,
      /^class\s+(\w+)/m,
    ],
    prefix: '',
  },
  {
    exts: ['.go'],
    patterns: [
      /^func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(/m,
      /^type\s+(\w+)\s+(?:struct|interface)/m,
    ],
    prefix: '',
  },
  {
    exts: ['.rs'],
    patterns: [
      /^pub\s+(?:async\s+)?fn\s+(\w+)/m,
      /^(?:pub\s+)?struct\s+(\w+)/m,
      /^(?:pub\s+)?(?:trait|enum|impl)\s+(\w+)/m,
    ],
    prefix: '',
  },
  {
    exts: ['.java', '.kt'],
    patterns: [
      /^(?:public|private|protected)?\s*(?:static\s+)?(?:\w+\s+)+(\w+)\s*\(/m,
      /^(?:public|private)?\s*class\s+(\w+)/m,
      /^(?:public|private)?\s*interface\s+(\w+)/m,
    ],
    prefix: '',
  },
]

function extractSymbols(content: string, ext: string): string[] {
  const symbols: string[] = []
  const langDef = SYMBOL_PATTERNS.find(l => l.exts.includes(ext))
  if (!langDef) return symbols

  const lines = content.split('\n')
  for (const line of lines.slice(0, 200)) { // scan first 200 lines
    for (const pattern of langDef.patterns) {
      const m = line.match(pattern)
      if (m?.[1] && !symbols.includes(m[1])) {
        symbols.push(m[1])
        break
      }
    }
  }
  return symbols
}

const IGNORE_DIRS = [
  '**/node_modules/**', '**/.git/**', '**/dist/**',
  '**/.next/**', '**/build/**', '**/__pycache__/**',
  '**/target/**', '**/.cargo/**', '**/*.min.js',
]

export const RepoMapTool: Tool<Input> = {
  name: 'RepoMap',
  description:
    'Generate a token-efficient map of the repository structure, including file paths and key symbols. ' +
    'Use this to understand the codebase layout without reading every file. ' +
    'Outputs file tree + top-level function/class names grouped by directory.',
  inputSchema,

  async call(input: Input, context: ToolContext): Promise<ToolResult> {
    const root = input.focus_path
      ? resolve(context.workingDir, input.focus_path)
      : context.workingDir

    if (!existsSync(root)) {
      return { content: [{ type: 'text', text: `Path not found: ${root}` }], isError: true }
    }

    const files = await fg('**/*', {
      cwd: root,
      ignore: IGNORE_DIRS,
      onlyFiles: true,
      dot: false,
    })

    files.sort()

    if (files.length === 0) {
      return { content: [{ type: 'text', text: 'No files found.' }] }
    }

    // Group by directory, extract symbols
    const dirMap = new Map<string, Array<{ file: string; symbols: string[] }>>()

    const MAX_FILES = 500
    const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.kt', '.rb', '.php', '.cpp', '.c', '.h'])

    for (const f of files.slice(0, MAX_FILES)) {
      const ext = extname(f)
      const dir = f.includes('/') ? f.slice(0, f.lastIndexOf('/')) : '.'
      const entry = dirMap.get(dir) ?? []

      let symbols: string[] = []
      if (SOURCE_EXTS.has(ext)) {
        try {
          const content = readFileSync(resolve(root, f), 'utf-8')
          symbols = extractSymbols(content, ext)
        } catch { /* skip unreadable */ }
      }

      entry.push({ file: f.includes('/') ? f.slice(f.lastIndexOf('/') + 1) : f, symbols })
      dirMap.set(dir, entry)
    }

    // Build output
    const lines: string[] = [
      `Repository map: ${relative(process.cwd(), root) || '.'}`,
      `Files: ${files.length}${files.length > MAX_FILES ? ` (showing first ${MAX_FILES})` : ''}`,
      '',
    ]

    const sortedDirs = Array.from(dirMap.keys()).sort()

    for (const dir of sortedDirs) {
      const entries = dirMap.get(dir)!
      lines.push(`${dir}/`)
      for (const { file, symbols } of entries) {
        if (symbols.length > 0) {
          // Trim symbol list to avoid token explosion
          const trimmed = symbols.slice(0, 8)
          const suffix = symbols.length > 8 ? ` +${symbols.length - 8}` : ''
          lines.push(`  ${file}  [${trimmed.join(', ')}${suffix}]`)
        } else {
          lines.push(`  ${file}`)
        }
      }
    }

    const text = lines.join('\n')

    // Rough token estimate (4 chars/token) and trim if needed
    const estimatedTokens = Math.ceil(text.length / 4)
    if (estimatedTokens > input.max_tokens) {
      const charLimit = input.max_tokens * 4
      return {
        content: [{
          type: 'text',
          text: text.slice(0, charLimit) + `\n\n[Repo map truncated at ~${input.max_tokens} tokens]`,
        }],
      }
    }

    return { content: [{ type: 'text', text }] }
  },

  toDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          max_tokens: { type: 'integer', description: 'Max tokens for output', default: 2000 },
          focus_path: { type: 'string', description: 'Subdirectory to focus on' },
        },
      },
    }
  },
}
