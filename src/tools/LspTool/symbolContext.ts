/**
 * Symbol context extraction — ported from CC's tools/LSPTool/symbolContext.ts
 *
 * Reads the word/symbol at a specific position in a source file.
 * Used to enrich LSP tool use messages with context.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const MAX_READ_BYTES = 64 * 1024  // 64KB — covers ~1000 lines

/**
 * Extract the symbol/word at a specific position in a file.
 *
 * @param filePath Absolute or relative path to the file
 * @param line 0-indexed line number
 * @param character 0-indexed character offset
 * @returns The symbol string, or null if extraction fails
 */
export function getSymbolAtPosition(
  filePath: string,
  line: number,
  character: number,
): string | null {
  try {
    const absolutePath = resolve(filePath)
    const buf = readFileSync(absolutePath)
    const content = buf.slice(0, MAX_READ_BYTES).toString('utf-8')
    const lines = content.split('\n')

    if (line < 0 || line >= lines.length) return null

    // If file continues past buffer, last line may be truncated
    if (buf.length >= MAX_READ_BYTES && line === lines.length - 1) return null

    const lineContent = lines[line]
    if (!lineContent || character < 0 || character >= lineContent.length) return null

    // Find word boundary at character position
    const WORD_RE = /[a-zA-Z0-9_$'!]/

    // Expand left
    let start = character
    while (start > 0 && WORD_RE.test(lineContent[start - 1] ?? '')) start--

    // Expand right
    let end = character
    while (end < lineContent.length && WORD_RE.test(lineContent[end] ?? '')) end++

    const symbol = lineContent.slice(start, end)
    return symbol.length > 0 ? symbol : null
  } catch {
    return null
  }
}

/**
 * Format the symbol context for display in tool use messages.
 */
export function formatSymbolContext(
  filePath: string,
  line: number,      // 1-indexed (as shown in editors)
  character: number, // 1-indexed (as shown in editors)
): string {
  const symbol = getSymbolAtPosition(filePath, line - 1, character - 1)
  if (symbol) return `"${symbol}" at ${filePath}:${line}:${character}`
  return `${filePath}:${line}:${character}`
}
