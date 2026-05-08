import { z } from 'zod'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import type { Tool, ToolResult, ToolContext, ToolDefinition } from '../types/tool'
import { backupFile } from '../utils/fileHistory'

const inputSchema = z.object({
  file_path: z.string().describe('Path to the file to edit'),
  old_string: z.string().describe('The exact string to replace (must be unique in the file)'),
  new_string: z.string().describe('The string to replace it with'),
  replace_all: z.boolean().default(false).describe('Replace all occurrences instead of requiring uniqueness'),
})

type Input = z.infer<typeof inputSchema>

export const FileEditTool: Tool<Input> = {
  name: 'FileEdit',
  description:
    'Edit a file by replacing an exact string with a new string. ' +
    'The old_string must appear exactly once in the file (or use replace_all: true). ' +
    'Preserves all other content and formatting. ' +
    'Prefer this over FileWrite when making targeted edits to existing files.',
  inputSchema,

  async call(input: Input, context: ToolContext): Promise<ToolResult> {
    const filePath = resolve(context.workingDir, input.file_path)

    if (!existsSync(filePath)) {
      return {
        content: [{ type: 'text', text: `File not found: ${input.file_path}` }],
        isError: true,
      }
    }

    // Backup before modification (no-op on second call for same file in session)
    await backupFile(filePath, context.workingDir)

    const content = readFileSync(filePath, 'utf-8')

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
      if (count > 1) {
        return {
          content: [{
            type: 'text',
            text: `Found ${count} occurrences of the string. Use replace_all: true to replace all, or provide more context to make it unique.`,
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

    writeFileSync(filePath, newContent, 'utf-8')

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
          old_string: { type: 'string', description: 'The exact string to replace' },
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
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
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
