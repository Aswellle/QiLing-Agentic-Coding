/**
 * Memory directory orchestrator — CC-compatible memdir system.
 *
 * Manages per-project memory as individual .md topic files with YAML frontmatter,
 * plus a MEMORY.md index file. The AI reads/writes these files directly using
 * standard file tools (FileRead, FileWrite). This module builds the system
 * prompt section that explains the memory system.
 */

import { join } from 'path'
import { readFileSync, existsSync } from 'fs'
import { getAutoMemPath, isAutoMemoryEnabled, ensureMemoryDirExists } from './paths'
import {
  TYPES_SECTION_INDIVIDUAL,
  WHAT_NOT_TO_SAVE_SECTION,
  WHEN_TO_ACCESS_SECTION,
  TRUSTING_RECALL_SECTION,
  MEMORY_FRONTMATTER_EXAMPLE,
} from './memoryTypes'

export { getAutoMemPath, isAutoMemoryEnabled, ensureMemoryDirExists } from './paths'
export { memoryAge, memoryAgeDays, memoryFreshnessNote, memoryFreshnessText } from './memoryAge'
export { scanMemoryFiles, formatMemoryManifest } from './memoryScan'
export type { MemoryHeader } from './memoryScan'
export { parseMemoryType } from './memoryTypes'
export type { MemoryType } from './memoryTypes'

export const ENTRYPOINT_NAME = 'MEMORY.md'
export const MAX_ENTRYPOINT_LINES = 200
export const MAX_ENTRYPOINT_BYTES = 25_000

export const DIR_EXISTS_GUIDANCE =
  'This directory already exists — write to it directly with the Write tool (do not run mkdir or check for its existence).'

// ─── Entrypoint content helpers ──────────────────────────────────────────────

export function truncateEntrypointContent(raw: string): {
  content: string
  wasLineTruncated: boolean
  wasByteTruncated: boolean
} {
  let content = raw
  let wasLineTruncated = false
  let wasByteTruncated = false

  // Line cap
  const lines = content.split('\n')
  if (lines.length > MAX_ENTRYPOINT_LINES) {
    content = lines.slice(0, MAX_ENTRYPOINT_LINES).join('\n')
    wasLineTruncated = true
  }

  // Byte cap (after line truncation)
  const encoded = Buffer.from(content, 'utf-8')
  if (encoded.length > MAX_ENTRYPOINT_BYTES) {
    // Truncate to MAX_ENTRYPOINT_BYTES characters (conservative: use slice on string)
    // Walk back to a line boundary to avoid cutting mid-line
    let cutoff = MAX_ENTRYPOINT_BYTES
    while (cutoff > 0 && content.charCodeAt(cutoff) !== 10 /* \n */) cutoff--
    content = content.slice(0, cutoff)
    wasByteTruncated = true
  }

  return { content, wasLineTruncated, wasByteTruncated }
}

// ─── System prompt builder ────────────────────────────────────────────────────

/**
 * Build the full memory instructions block.
 * Matches CC's buildMemoryLines structure exactly:
 *   1. Header with memory dir path
 *   2. Memory system description
 *   3. Types taxonomy (4 types)
 *   4. What NOT to save
 *   5. How to save (2-step: write file + update index)
 *   6. When to access
 *   7. Trusting recall
 *   8. MEMORY.md index content (if it exists)
 */
export function buildMemoryLines(
  displayName: string,
  memoryDir: string,
  extraGuidelines?: string[]
): string[] {
  const entrypointPath = join(memoryDir, ENTRYPOINT_NAME)
  const lines: string[] = []

  // ── Header ──
  lines.push('# Memory')
  lines.push('')
  lines.push(
    `You have access to a persistent memory system called "${displayName}". ` +
    `Memory is stored as individual markdown files in: ${memoryDir}`
  )
  lines.push('')
  lines.push(
    `The ${ENTRYPOINT_NAME} file in that directory is an index of all your memory files. ` +
    `It lists each file by name with a one-line description. ` +
    `Read it to know what memories exist, then read individual files for full content.`
  )
  lines.push('')

  // ── Types taxonomy ──
  lines.push(...TYPES_SECTION_INDIVIDUAL)

  // ── What NOT to save ──
  lines.push(...WHAT_NOT_TO_SAVE_SECTION)

  // ── How to save ──
  lines.push('## How to save a memory')
  lines.push('')
  lines.push(
    'To save a memory, complete BOTH of these steps in order:'
  )
  lines.push('')
  lines.push('**Step 1 — Write the memory file:**')
  lines.push(
    `Create a new .md file in ${memoryDir} with a short kebab-case name (e.g. \`user-prefers-typescript.md\`). ` +
    `${DIR_EXISTS_GUIDANCE}`
  )
  lines.push('')
  lines.push('Use this exact frontmatter format:')
  lines.push('')
  lines.push(...MEMORY_FRONTMATTER_EXAMPLE)

  lines.push('**Step 2 — Update the index:**')
  lines.push(
    `Add a line to ${entrypointPath} in this format: \`- [name](name.md) — one-line description\`. ` +
    `If ${ENTRYPOINT_NAME} does not exist yet, create it with a \`# Memory Index\` heading first.`
  )
  lines.push('')

  // ── When to access ──
  lines.push(...WHEN_TO_ACCESS_SECTION)

  // ── Trusting recall ──
  lines.push(...TRUSTING_RECALL_SECTION)

  // ── Extra guidelines (optional) ──
  if (extraGuidelines && extraGuidelines.length > 0) {
    lines.push('## Additional guidelines')
    lines.push('')
    lines.push(...extraGuidelines)
    lines.push('')
  }

  // ── MEMORY.md index content ──
  if (existsSync(entrypointPath)) {
    try {
      const raw = readFileSync(entrypointPath, 'utf-8')
      const { content, wasLineTruncated, wasByteTruncated } = truncateEntrypointContent(raw)
      lines.push(`## Current ${ENTRYPOINT_NAME} index`)
      lines.push('')
      lines.push(content)
      if (wasLineTruncated) {
        lines.push(`... (truncated at ${MAX_ENTRYPOINT_LINES} lines — open the file directly for the full index)`)
      } else if (wasByteTruncated) {
        lines.push(`... (truncated at ${MAX_ENTRYPOINT_BYTES} bytes — open the file directly for the full index)`)
      }
      lines.push('')
    } catch {
      // If MEMORY.md is unreadable, skip it silently
    }
  } else {
    lines.push(`## Current ${ENTRYPOINT_NAME} index`)
    lines.push('')
    lines.push(`(${ENTRYPOINT_NAME} does not exist yet — create it when you save your first memory)`)
    lines.push('')
  }

  return lines
}

/**
 * Build the full memory prompt string.
 * Reads MEMORY.md synchronously (prompt building is sync in the query pipeline).
 */
export function buildMemoryPrompt(params: { displayName: string; memoryDir: string }): string {
  return buildMemoryLines(params.displayName, params.memoryDir).join('\n')
}

/**
 * Load the memory prompt for a working directory.
 * Ensures the memory directory exists, then builds the prompt.
 * Returns null if auto-memory is disabled.
 */
export async function loadMemoryPrompt(
  workingDir: string,
  settings?: { autoMemoryEnabled?: boolean }
): Promise<string | null> {
  if (!isAutoMemoryEnabled(settings)) return null
  const memoryDir = getAutoMemPath(workingDir)
  await ensureMemoryDirExists(memoryDir)
  return buildMemoryLines('auto memory', memoryDir).join('\n')
}
