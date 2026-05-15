import { z } from 'zod'
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs'
import { resolve, dirname, basename, join, relative } from 'path'
import type { Tool, ToolResult, ToolContext, ToolDefinition } from '../types/tool'
import { backupFile } from '../utils/fileHistory'

// CC's writeTextContent: preserve CRLF line endings (Windows compat)
function hasCRLF(text: string): boolean { return text.includes('\r\n') }
function normalizeToCRLF(text: string): string {
  return text.replaceAll('\r\n', '\n').split('\n').join('\r\n')
}

// ─── UTF-16 BOM detection ─────────────────────────────────────────────────────

function detectEncoding(filePath: string): 'utf-8' | 'utf16le' {
  try {
    const buf = readFileSync(filePath) as Buffer
    // UTF-16LE BOM: FF FE
    if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) return 'utf16le'
    // UTF-16BE BOM: FE FF  — treat as utf16le for Node/Bun decode compat
    if (buf.length >= 2 && buf[0] === 0xFE && buf[1] === 0xFF) return 'utf16le'
  } catch { /* */ }
  return 'utf-8'
}

// ─── Similar file suggestions ─────────────────────────────────────────────────

/** Simple Levenshtein distance for fuzzy filename matching */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] = a[i - 1] === b[j - 1] ? dp[i - 1]![j - 1]! :
        1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!)
    }
  }
  return dp[m]![n]!
}

async function findSimilarFiles(filePath: string, workingDir: string): Promise<string[]> {
  const absPath = resolve(workingDir, filePath)
  const targetName = basename(absPath).toLowerCase()
  const targetDir = dirname(absPath)

  const suggestions: string[] = []
  const targetStem = targetName.replace(/\.[^.]+$/, '')

  const searchDirs = [targetDir, workingDir]
  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue
    try {
      const entries = readdirSync(dir)
      for (const entry of entries) {
        const entryLower = entry.toLowerCase()
        if (entryLower === targetName) continue  // exact name (wrong case?) — skip

        const entryStem = entryLower.replace(/\.[^.]+$/, '')

        if (
          entryLower.startsWith(targetStem.slice(0, Math.max(3, targetStem.length - 2))) ||
          entryStem.includes(targetStem) ||
          targetStem.includes(entryStem) ||
          levenshtein(entryLower, targetName) <= 3
        ) {
          const fullPath = join(dir, entry)
          try {
            if (statSync(fullPath).isFile()) {
              suggestions.push(relative(workingDir, fullPath))
            }
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
  }

  return suggestions.slice(0, 5)
}

const inputSchema = z.object({
  file_path: z.string().describe('Path to the file to edit'),
  old_string: z.string().describe('The exact string to replace (must be unique in the file). Pass empty string to create a new file with new_string as content.'),
  new_string: z.string().describe('The string to replace it with'),
  replace_all: z.boolean().default(false).describe('Replace all occurrences instead of requiring uniqueness'),
})

type Input = z.infer<typeof inputSchema>

export const FileEditTool: Tool<Input> = {
  name: 'FileEdit',
  description: `Performs exact string replacements in files.

Usage:
- You must use your \`Read\` tool at least once in the conversation before editing. This tool will error if you attempt an edit without reading the file.
- When editing text from Read tool output, ensure you preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix. The line number prefix format is: line number + tab. Everything after that is the actual file content to match. Never include any part of the line number prefix in the old_string or new_string.
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
- Only use emojis if the user explicitly requests it. Avoid adding emojis to files unless asked.
- The edit will FAIL if \`old_string\` is not unique in the file. Either provide a larger string with more surrounding context to make it unique or use \`replace_all\` to change every instance of \`old_string\`.
- Use \`replace_all\` for replacing and renaming strings across the file. This parameter is useful if you want to rename a variable for instance.
- To create a new file, set \`old_string\` to empty string \`""\` and \`new_string\` to the desired file content.`,
  inputSchema,

  async call(input: Input, context: ToolContext): Promise<ToolResult> {
    const filePath = resolve(context.workingDir, input.file_path)

    // ── Create new file when old_string is empty ────────────────────────────
    if (!existsSync(filePath) && input.old_string === '') {
      mkdirSync(dirname(filePath), { recursive: true })
      writeFileSync(filePath, input.new_string, 'utf-8')
      return {
        content: [{ type: 'text', text: `Created new file: ${input.file_path}` }],
      }
    }

    // ── File not found — suggest similar files ──────────────────────────────
    if (!existsSync(filePath)) {
      const suggestions = await findSimilarFiles(input.file_path, context.workingDir)
      const suggestionText = suggestions.length > 0
        ? `\n\nDid you mean one of these?\n${suggestions.map(s => `  - ${s}`).join('\n')}`
        : '\n\nNote: Use the Glob tool to search for files by pattern.'
      return {
        content: [{ type: 'text', text: `File not found: ${input.file_path}${suggestionText}` }],
        isError: true,
      }
    }

    // Backup before modification (no-op on second call for same file in session)
    await backupFile(filePath, context.workingDir)

    // ── Read with encoding detection (UTF-16 BOM support) ──────────────────
    const encoding = detectEncoding(filePath)
    const rawContent = readFileSync(filePath)
    const content = encoding === 'utf16le'
      ? rawContent.toString('utf16le')
      : rawContent.toString('utf-8')

    // CC's findActualString: fuzzy quote normalization for curly vs straight quotes
    const actualOldString = findActualString(content, input.old_string)
    const effectiveOldString = actualOldString ?? input.old_string
    const quoteNormalized = actualOldString !== null && actualOldString !== input.old_string

    if (!input.replace_all) {
      const count = countOccurrences(content, effectiveOldString)
      if (count === 0) {
        // Try whitespace-normalized fallback
        const wsNormMsg = input.old_string.includes('\n')
          ? '\n\nTip: If the string spans multiple lines, ensure indentation/whitespace matches exactly.'
          : ''
        return {
          content: [{ type: 'text', text: `String not found in file:\n${input.old_string}${wsNormMsg}` }],
          isError: true,
        }
      }
      // ── Improved "not unique" error with occurrence count ─────────────────
      if (count > 1) {
        return {
          content: [{
            type: 'text',
            text: `old_string is not unique — found ${count} occurrences in ${input.file_path}. ` +
              `Either provide more surrounding context to make it unique, or use replace_all: true to replace all instances.`,
          }],
          isError: true,
        }
      }
    }

    // Preserve curly quote style if normalization was applied (CC's preserveQuoteStyle)
    const effectiveNewString = quoteNormalized
      ? preserveQuoteStyle(input.old_string, effectiveOldString, input.new_string)
      : input.new_string

    const newContent = input.replace_all
      ? content.split(effectiveOldString).join(effectiveNewString)
      : content.replace(effectiveOldString, effectiveNewString)

    // CC's writeTextContent: preserve CRLF line endings from source file
    const contentToWrite = hasCRLF(content) ? normalizeToCRLF(newContent) : newContent

    // Write back with original encoding preserved
    if (encoding === 'utf16le') {
      writeFileSync(filePath, Buffer.from(contentToWrite, 'utf16le'))
    } else {
      writeFileSync(filePath, contentToWrite, 'utf-8')
    }

    const occurrences = countOccurrences(content, effectiveOldString)
    // Embed diff metadata as JSON comment so ToolCallDisplay can render it
    const diffMeta = JSON.stringify({
      __diff: true,
      file_path: input.file_path,
      old_string: input.old_string.slice(0, 2000),
      new_string: input.new_string.slice(0, 2000),
    })
    return {
      content: [{
        type: 'text',
        text: `Successfully edited ${input.file_path} (replaced ${occurrences} occurrence${occurrences !== 1 ? 's' : ''}).\n<!--DIFF:${diffMeta}-->`,
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
          file_path: { type: 'string', description: 'Path to the file to edit' },
          old_string: { type: 'string', description: 'The exact string to replace. Pass empty string to create a new file.' },
          new_string: { type: 'string', description: 'The replacement string' },
          replace_all: { type: 'boolean', description: 'Replace all occurrences', default: false },
        },
        required: ['file_path', 'old_string', 'new_string'],
      },
    }
  },
}

function countOccurrences(text: string, pattern: string): number {
  if (pattern.length === 0) return 0
  let count = 0, pos = 0
  while ((pos = text.indexOf(pattern, pos)) !== -1) { count++; pos += pattern.length }
  return count
}

// ─── CC's quote normalization utilities ──────────────────────────────────────
// Mirrors CC's tools/FileEditTool/utils.ts findActualString + preserveQuoteStyle.
// Handles the common case where models use straight quotes but files use curly.

const CURLY_DOUBLE = ['“', '”']  // " "
const CURLY_SINGLE = ['‘', '’']  // ' '

function normalizeQuotes(s: string): string {
  return s
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
}

/**
 * Try to find searchString in fileContent, with curly-quote fallback.
 * Returns the actual substring as it appears in the file, or null if not found.
 * Mirrors CC's findActualString().
 */
function findActualString(fileContent: string, searchString: string): string | null {
  if (fileContent.includes(searchString)) return searchString

  const normSearch = normalizeQuotes(searchString)
  const normFile = normalizeQuotes(fileContent)
  const idx = normFile.indexOf(normSearch)
  if (idx === -1) return null
  return fileContent.substring(idx, idx + searchString.length)
}

/**
 * When old_string matched via quote normalization, apply the same curly quote
 * style to new_string so the edit preserves the file's typography.
 * Mirrors CC's preserveQuoteStyle().
 */
function preserveQuoteStyle(oldString: string, actualOldString: string, newString: string): string {
  if (oldString === actualOldString) return newString
  let result = newString
  if (CURLY_DOUBLE.some(c => actualOldString.includes(c))) {
    result = applyCurlyDouble(result)
  }
  if (CURLY_SINGLE.some(c => actualOldString.includes(c))) {
    result = applyCurlySingle(result)
  }
  return result
}

function applyCurlyDouble(s: string): string {
  let open = true
  return s.replace(/"/g, () => {
    const c = open ? '“' : '”'
    open = !open
    return c
  })
}

function applyCurlySingle(s: string): string {
  let open = true
  return s.replace(/'/g, () => {
    const c = open ? '‘' : '’'
    open = !open
    return c
  })
}
