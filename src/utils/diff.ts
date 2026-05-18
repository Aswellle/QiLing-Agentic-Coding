/**
 * Diff utilities — adapted from CC's utils/diff.ts
 *
 * Uses the 'diff' npm package (same as CC) to generate structured patches.
 * Used by FileEditTool to verify edits and show diffs in the UI.
 *
 * QiLing adaptation: removed analytics calls (logEvent, counters),
 * kept pure diff generation and line counting functions.
 */

import { structuredPatch, type StructuredPatchHunk } from 'diff'

export { type StructuredPatchHunk } from 'diff'

export const CONTEXT_LINES = 3
export const DIFF_TIMEOUT_MS = 5_000

// ─── Escaping (from CC — & and $ confuse the diff library) ───────────────────

const AMPERSAND_TOKEN = '<<:AMPERSAND:>>'
const DOLLAR_TOKEN = '<<:DOLLAR:>>'

function escapeForDiff(s: string): string {
  return s.replaceAll('&', AMPERSAND_TOKEN).replaceAll('$', DOLLAR_TOKEN)
}

function unescapeFromDiff(s: string): string {
  return s.replaceAll(AMPERSAND_TOKEN, '&').replaceAll(DOLLAR_TOKEN, '$')
}

// ─── Core diff functions ──────────────────────────────────────────────────────

/**
 * Adjust hunk line numbers by an offset (for partial file views).
 */
export function adjustHunkLineNumbers(
  hunks: StructuredPatchHunk[],
  offset: number,
): StructuredPatchHunk[] {
  if (offset === 0) return hunks
  return hunks.map(h => ({
    ...h,
    oldStart: h.oldStart + offset,
    newStart: h.newStart + offset,
  }))
}

/**
 * Count lines added/removed in a patch.
 * Returns { added, removed }.
 */
export function countLinesChanged(
  patch: StructuredPatchHunk[],
  newFileContent?: string,
): { added: number; removed: number } {
  if (patch.length === 0 && newFileContent) {
    const added = newFileContent.split(/\r?\n/).length
    return { added, removed: 0 }
  }

  const added = patch.reduce(
    (acc, hunk) => acc + hunk.lines.filter((l: string) => l.startsWith('+')).length,
    0,
  )
  const removed = patch.reduce(
    (acc, hunk) => acc + hunk.lines.filter((l: string) => l.startsWith('-')).length,
    0,
  )
  return { added, removed }
}

/**
 * Generate a structured patch from old and new file contents.
 *
 * @returns Array of patch hunks, or empty array if no changes
 */
export function getPatchFromContents({
  filePath,
  oldContent,
  newContent,
  ignoreWhitespace = false,
  singleHunk = false,
}: {
  filePath: string
  oldContent: string
  newContent: string
  ignoreWhitespace?: boolean
  singleHunk?: boolean
}): StructuredPatchHunk[] {
  const result = structuredPatch(
    filePath,
    filePath,
    escapeForDiff(oldContent),
    escapeForDiff(newContent),
    undefined,
    undefined,
    {
      ignoreWhitespace,
      context: singleHunk ? 100_000 : CONTEXT_LINES,
      timeout: DIFF_TIMEOUT_MS,
    },
  )
  if (!result) return []
  return result.hunks.map(h => ({
    ...h,
    lines: h.lines.map((l: string) => unescapeFromDiff(l)),
  }))
}

/**
 * Generate a patch for display purposes (converts leading tabs → spaces).
 */
export function getPatchForDisplay({
  filePath,
  oldContent,
  newContent,
  ignoreWhitespace = false,
}: {
  filePath: string
  oldContent: string
  newContent: string
  ignoreWhitespace?: boolean
}): StructuredPatchHunk[] {
  const convertTabs = (s: string): string =>
    s.split('\n').map(l => l.replace(/^\t+/, m => '  '.repeat(m.length))).join('\n')

  return getPatchFromContents({
    filePath,
    oldContent: convertTabs(oldContent),
    newContent: convertTabs(newContent),
    ignoreWhitespace,
  })
}

/**
 * Format a patch as a unified diff string.
 */
export function formatPatchAsUnifiedDiff(
  hunks: StructuredPatchHunk[],
  oldFile: string,
  newFile: string,
): string {
  if (hunks.length === 0) return ''
  const header = `--- ${oldFile}\n+++ ${newFile}\n`
  const body = hunks.map(h => {
    const hunkHeader = `@@ -${h.oldStart},${h.oldLines} +${h.newStart},${h.newLines} @@\n`
    return hunkHeader + h.lines.join('\n')
  }).join('\n')
  return header + body
}

/**
 * Check if a patch is non-empty (has any changes).
 */
export function hasDiff(hunks: StructuredPatchHunk[]): boolean {
  return hunks.some(h => h.lines.some(l => l.startsWith('+') || l.startsWith('-')))
}
