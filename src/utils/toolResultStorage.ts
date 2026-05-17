/**
 * Tool result storage — ported from CC's utils/toolResultStorage.ts
 *
 * Persists large tool outputs to disk instead of truncating them.
 * When a tool result exceeds the threshold, it's saved to:
 *   ~/.qiling/sessions/<pid>/tool-results/<toolUseId>.txt
 * and a short reference message is returned to the model.
 *
 * This prevents large outputs (grep results, file reads, etc.) from
 * consuming all context space while keeping the full output accessible.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

// ─── Constants ────────────────────────────────────────────────────────────────

export const TOOL_RESULTS_SUBDIR = 'tool-results'
export const PERSISTED_OUTPUT_TAG = '<persisted-output>'
export const PERSISTED_OUTPUT_CLOSING_TAG = '</persisted-output>'
export const TOOL_RESULT_CLEARED_MESSAGE = '[Old tool result content cleared]'

/** Default threshold (chars) above which we persist to disk */
const DEFAULT_PERSIST_THRESHOLD_CHARS = 50_000  // 50k chars ≈ 12.5k tokens

/** Preview shown in the reference message */
export const PREVIEW_SIZE_BYTES = 2000

// ─── Path helpers ─────────────────────────────────────────────────────────────

function getSessionDir(): string {
  return join(homedir(), '.qiling', 'sessions', String(process.pid))
}

export function getToolResultsDir(): string {
  return join(getSessionDir(), TOOL_RESULTS_SUBDIR)
}

export function getToolResultPath(id: string, isJson: boolean): string {
  return join(getToolResultsDir(), `${id}.${isJson ? 'json' : 'txt'}`)
}

async function ensureToolResultsDir(): Promise<void> {
  try { await mkdir(getToolResultsDir(), { recursive: true }) } catch { /* ok */ }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type PersistedToolResult = {
  filepath: string
  originalSize: number
  isJson: boolean
  preview: string
  hasMore: boolean
}

export type PersistToolResultError = { error: string }

export type ContentBlock = { type: string; text?: string }

// ─── Preview generation ───────────────────────────────────────────────────────

export function generatePreview(content: string, maxBytes: number): { preview: string; hasMore: boolean } {
  if (content.length <= maxBytes) return { preview: content, hasMore: false }
  return { preview: content.slice(0, maxBytes), hasMore: true }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

// ─── Threshold resolution ─────────────────────────────────────────────────────

/**
 * Resolve the persistence threshold for a tool.
 * Uses the tool's declared maxResultSizeChars, capped at DEFAULT_PERSIST_THRESHOLD_CHARS.
 * Returns Infinity if the tool opts out (FileRead — circular if persisted).
 */
export function getPersistenceThreshold(
  toolName: string,
  declaredMaxResultSizeChars: number,
): number {
  // Tools that read files shouldn't persist (would create circular references)
  if (toolName === 'FileRead' || toolName === 'ReadMcpResource') {
    return Infinity
  }
  if (!Number.isFinite(declaredMaxResultSizeChars)) return declaredMaxResultSizeChars
  return Math.min(declaredMaxResultSizeChars, DEFAULT_PERSIST_THRESHOLD_CHARS)
}

/**
 * Check if content needs persistence (exceeds threshold).
 */
export function mcpContentNeedsTruncation(
  content: string | ContentBlock[],
  threshold: number,
): boolean {
  const size = typeof content === 'string' ? content.length : JSON.stringify(content).length
  return size > threshold
}

// ─── Main API ─────────────────────────────────────────────────────────────────

/**
 * Persist a tool result to disk when it's too large to include in context.
 * Returns PersistedToolResult on success, PersistToolResultError on failure.
 */
export async function persistToolResult(
  content: string | ContentBlock[],
  toolUseId: string,
): Promise<PersistedToolResult | PersistToolResultError> {
  const isJson = Array.isArray(content)

  // Only text content can be persisted
  if (isJson) {
    const hasNonText = (content as ContentBlock[]).some(b => b.type !== 'text')
    if (hasNonText) {
      return { error: 'Cannot persist tool results containing non-text content' }
    }
  }

  await ensureToolResultsDir()
  const filepath = getToolResultPath(toolUseId, isJson)
  const contentStr = isJson ? JSON.stringify(content, null, 2) : String(content)

  try {
    // Use 'wx' flag: write only if not exists (idempotent across turns)
    await writeFile(filepath, contentStr, { encoding: 'utf-8', flag: 'wx' })
    if (process.env.QILING_DEBUG === '1') {
      console.error(`[toolResultStorage] Persisted ${formatFileSize(contentStr.length)} to ${filepath}`)
    }
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code !== 'EEXIST') {
      return { error: `Failed to persist tool result: ${err instanceof Error ? err.message : String(err)}` }
    }
    // EEXIST: already persisted on a prior turn — fall through to preview
  }

  const { preview, hasMore } = generatePreview(contentStr, PREVIEW_SIZE_BYTES)

  return { filepath, originalSize: contentStr.length, isJson, preview, hasMore }
}

/**
 * Build the reference message shown to the model when a result was persisted.
 */
export function buildLargeToolResultMessage(result: PersistedToolResult): string {
  let msg = `${PERSISTED_OUTPUT_TAG}\n`
  msg += `Output too large (${formatFileSize(result.originalSize)}). Full output saved to: ${result.filepath}\n\n`
  msg += `Preview (first ${formatFileSize(PREVIEW_SIZE_BYTES)}):\n`
  msg += result.preview
  msg += result.hasMore ? '\n...\n' : '\n'
  msg += PERSISTED_OUTPUT_CLOSING_TAG
  return msg
}

/**
 * Check if a tool result error is a persistence error.
 */
export function isPersistError(result: PersistedToolResult | PersistToolResultError): result is PersistToolResultError {
  return 'error' in result
}

/**
 * Process a text tool result: persist if too large, return compact content.
 * Returns the original content if under threshold, or the reference message if persisted.
 */
export async function processLargeToolResult(
  toolName: string,
  toolUseId: string,
  content: string,
  maxResultSizeChars = DEFAULT_PERSIST_THRESHOLD_CHARS,
): Promise<string> {
  const threshold = getPersistenceThreshold(toolName, maxResultSizeChars)

  if (!Number.isFinite(threshold) || content.length <= threshold) {
    return content
  }

  const result = await persistToolResult(content, toolUseId)
  if (isPersistError(result)) {
    // Persistence failed — fall back to truncation
    return content.slice(0, threshold) + `\n\n[Output truncated at ${formatFileSize(threshold)}. Persistence failed: ${result.error}]`
  }

  return buildLargeToolResultMessage(result)
}
