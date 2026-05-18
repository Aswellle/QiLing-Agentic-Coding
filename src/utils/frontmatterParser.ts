/**
 * Frontmatter parser for markdown files — adapted from CC's utils/frontmatterParser.ts
 *
 * Extracts and parses YAML frontmatter between --- delimiters.
 * Used by skill/command loaders, output-style loaders, and agent definition loaders.
 *
 * QiLing adaptation: removed HooksSettings import (use Record<string,unknown>),
 * removed logForDebugging dependency (use console.error in debug mode).
 */

export type FrontmatterData = {
  'allowed-tools'?: string | string[] | null
  description?: string | null
  type?: string | null
  'argument-hint'?: string | null
  when_to_use?: string | null
  version?: string | null
  'hide-from-slash-command-tool'?: string | null
  model?: string | null
  skills?: string | null
  'user-invocable'?: string | null
  hooks?: Record<string, unknown> | null
  effort?: string | null
  context?: 'inline' | 'fork' | null
  agent?: string | null
  paths?: string | string[] | null
  shell?: string | null
  [key: string]: unknown
}

export type ParsedMarkdown = {
  frontmatter: FrontmatterData
  content: string
}

// ─── YAML-lite parser for frontmatter ────────────────────────────────────────
// Handles the subset of YAML used in skill/command frontmatter without a full YAML library.

function parseSimpleYaml(text: string): FrontmatterData {
  const result: FrontmatterData = {}
  const lines = text.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]!
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1 || line.trim().startsWith('#')) { i++; continue }

    const key = line.slice(0, colonIdx).trim()
    const rawValue = line.slice(colonIdx + 1).trim()

    if (!key) { i++; continue }

    // Multi-line list: key:\n  - item
    if (rawValue === '' && lines[i + 1]?.trimStart().startsWith('-')) {
      const items: string[] = []
      i++
      while (i < lines.length && lines[i]!.trimStart().startsWith('-')) {
        items.push(lines[i]!.replace(/^\s*-\s*/, '').trim().replace(/^['"]|['"]$/g, ''))
        i++
      }
      result[key] = items
      continue
    }

    // Inline list: key: [a, b, c]
    if (rawValue.startsWith('[')) {
      const inner = rawValue.slice(1, rawValue.lastIndexOf(']'))
      result[key] = inner.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
      i++; continue
    }

    // Quoted string
    if ((rawValue.startsWith('"') && rawValue.endsWith('"')) ||
        (rawValue.startsWith("'") && rawValue.endsWith("'"))) {
      result[key] = rawValue.slice(1, -1)
      i++; continue
    }

    // Boolean
    if (rawValue === 'true') { result[key] = true; i++; continue }
    if (rawValue === 'false') { result[key] = false; i++; continue }
    if (rawValue === 'null' || rawValue === '~') { result[key] = null; i++; continue }

    // Number
    if (/^-?\d+(\.\d+)?$/.test(rawValue)) {
      result[key] = Number(rawValue); i++; continue
    }

    // String (may be multi-line with |)
    if (rawValue === '|') {
      const bodyLines: string[] = []
      i++
      const indent = lines[i]?.match(/^(\s+)/)?.[1]?.length ?? 0
      while (i < lines.length && (lines[i]!.trim() === '' || lines[i]!.startsWith(' '.repeat(indent)))) {
        bodyLines.push(lines[i]!.slice(indent))
        i++
      }
      result[key] = bodyLines.join('\n').trimEnd()
      continue
    }

    result[key] = rawValue || null
    i++
  }

  return result
}

// Regex: matches --- ... --- at start of file, capturing YAML content
const FRONTMATTER_REGEX = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/

/**
 * Parse a markdown file's YAML frontmatter.
 * Returns { frontmatter, content } where content is everything after the closing ---.
 */
export function parseFrontmatter(markdown: string, _sourcePath?: string): ParsedMarkdown {
  const match = markdown.match(FRONTMATTER_REGEX)

  if (!match) {
    return { frontmatter: {}, content: markdown }
  }

  const frontmatterText = match[1] ?? ''
  const content = markdown.slice(match[0].length)

  let frontmatter: FrontmatterData = {}
  try {
    frontmatter = parseSimpleYaml(frontmatterText)
  } catch {
    // Fall back to empty frontmatter on parse error
  }

  return { frontmatter, content }
}

/**
 * Extract a description from markdown content (first non-empty, non-heading line).
 * Used when no description is in frontmatter.
 */
export function extractDescriptionFromMarkdown(
  content: string,
  fallback?: string,
): string | null {
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
      return trimmed.slice(0, 200)  // cap at 200 chars
    }
  }
  return fallback ?? null
}

/**
 * Parse a positive integer from a frontmatter value.
 */
export function parsePositiveIntFromFrontmatter(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined
  const parsed = typeof value === 'number' ? value : parseInt(String(value), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

/**
 * Validate and coerce a description value from frontmatter.
 * Strings → trimmed. Numbers/booleans → coerced. Arrays/objects → null.
 */
export function coerceDescriptionToString(
  value: unknown,
  componentName?: string,
): string | null {
  if (value == null) return null
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  // Non-scalar (array/object) — invalid, omit
  if (process.env.QILING_DEBUG === '1') {
    console.error(`[frontmatterParser] Description invalid for ${componentName ?? 'unknown'} - omitting`)
  }
  return null
}

/**
 * Split a path pattern from frontmatter (comma-separated or array).
 */
export function splitPathInFrontmatter(value: string | string[] | null | undefined): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  return value.split(',').map(s => s.trim()).filter(Boolean)
}
