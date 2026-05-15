/**
 * Memory directory scanner.
 * Reads .md files from a memory directory, extracts frontmatter headers,
 * and returns them sorted by mtime (newest first), capped at 200 entries.
 */

import { readdir, stat, readFile } from 'fs/promises'
import { join } from 'path'
import { parseYaml } from '../../utils/yaml'
import { parseMemoryType } from './memoryTypes'
import type { MemoryType } from './memoryTypes'

export type MemoryHeader = {
  filename: string   // relative path within memory dir (e.g. "feedback-cc-port.md")
  filePath: string   // absolute path
  mtimeMs: number
  description: string | null
  type: MemoryType | undefined
}

const MAX_MEMORY_FILES = 200
const FRONTMATTER_READ_LINES = 30
const ENTRYPOINT_NAME = 'MEMORY.md'

/**
 * Parse YAML frontmatter from the first N lines of a file.
 * Returns the parsed metadata object, or null if no valid frontmatter found.
 */
function parseFrontmatter(content: string): Record<string, unknown> | null {
  const lines = content.split('\n')
  if (lines[0]?.trim() !== '---') return null

  const endIdx = lines.indexOf('---', 1)
  if (endIdx === -1) return null

  const yamlBlock = lines.slice(1, endIdx).join('\n')
  try {
    const parsed = parseYaml(yamlBlock)
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    // fall through
  }
  return null
}

/**
 * Scan a memory directory for .md files.
 * Excludes MEMORY.md (the index). Returns sorted by mtime desc, capped at 200.
 */
export async function scanMemoryFiles(memoryDir: string, signal?: AbortSignal): Promise<MemoryHeader[]> {
  let entries: string[]
  try {
    entries = await readdir(memoryDir)
  } catch {
    return []
  }

  const mdFiles = entries.filter(
    f => f.endsWith('.md') && f !== ENTRYPOINT_NAME
  )

  const headers: MemoryHeader[] = []

  for (const filename of mdFiles) {
    if (signal?.aborted) break
    const filePath = join(memoryDir, filename)
    let mtimeMs = 0
    let description: string | null = null
    let type: MemoryType | undefined = undefined

    try {
      const fileStat = await stat(filePath)
      mtimeMs = fileStat.mtimeMs

      // Read only the first FRONTMATTER_READ_LINES lines for efficiency
      const raw = await readFile(filePath, 'utf-8')
      const firstLines = raw.split('\n').slice(0, FRONTMATTER_READ_LINES).join('\n')

      const fm = parseFrontmatter(firstLines)
      if (fm) {
        if (typeof fm.description === 'string' && fm.description.trim()) {
          description = fm.description.trim()
        }
        // metadata.type or top-level type
        const metadata = fm.metadata
        if (metadata !== null && typeof metadata === 'object' && !Array.isArray(metadata)) {
          const meta = metadata as Record<string, unknown>
          type = parseMemoryType(meta.type)
        }
        if (type === undefined) {
          type = parseMemoryType(fm.type)
        }
      }
    } catch {
      // skip unreadable files
    }

    headers.push({ filename, filePath, mtimeMs, description, type })
  }

  // Sort by mtime descending (newest first), then cap
  headers.sort((a, b) => b.mtimeMs - a.mtimeMs)
  return headers.slice(0, MAX_MEMORY_FILES)
}

/**
 * Format a memory manifest string for injection into the system prompt.
 * Lists all memory files with their type and description.
 */
export function formatMemoryManifest(memories: MemoryHeader[]): string {
  if (memories.length === 0) return '(no memory files yet)'

  const lines: string[] = []
  for (const m of memories) {
    const typeTag = m.type ? `[${m.type}] ` : ''
    const desc = m.description ? ` — ${m.description}` : ''
    lines.push(`- ${typeTag}${m.filename}${desc}`)
  }
  return lines.join('\n')
}
