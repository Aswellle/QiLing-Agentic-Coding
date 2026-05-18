/**
 * MCP output storage utilities — adapted from CC's utils/mcpOutputStorage.ts
 *
 * Generates instruction text for large MCP outputs and handles MIME type mapping.
 * When MCP tool output exceeds token limits, it's saved to disk and the model
 * is instructed to read it via FileRead.
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { formatFileSize } from './format'

// ─── MCP result types ─────────────────────────────────────────────────────────

export type MCPResultType = 'toolResult' | 'structuredContent' | 'contentArray'

export function getFormatDescription(type: MCPResultType, schema?: unknown): string {
  switch (type) {
    case 'toolResult': return 'Plain text'
    case 'structuredContent': return schema ? `JSON with schema: ${schema}` : 'JSON'
    case 'contentArray': return schema ? `JSON array with schema: ${schema}` : 'JSON array'
  }
}

/**
 * Map a MIME type to a file extension for saved MCP output.
 */
export function extensionForMimeType(mimeType: string | undefined): string {
  if (!mimeType) return 'bin'
  const mt = (mimeType.split(';')[0] ?? '').trim().toLowerCase()
  const MIME_MAP: Record<string, string> = {
    'application/pdf': 'pdf', 'application/json': 'json',
    'text/csv': 'csv', 'text/plain': 'txt', 'text/html': 'html',
    'text/markdown': 'md', 'text/xml': 'xml', 'application/xml': 'xml',
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif',
    'image/webp': 'webp', 'image/svg+xml': 'svg',
  }
  return MIME_MAP[mt] ?? 'bin'
}

/**
 * Generate instruction text telling the model to read a saved large output.
 */
export function getLargeOutputInstructions(
  rawOutputPath: string,
  contentLength: number,
  formatDescription: string,
  maxReadLength?: number,
): string {
  const base = [
    `Error: result (${contentLength.toLocaleString()} characters) exceeds maximum allowed tokens. Output has been saved to ${rawOutputPath}.`,
    `Format: ${formatDescription}`,
    `Use offset and limit parameters to read specific portions of the file, search within it for specific content, and jq to make structured queries.`,
    `REQUIREMENTS FOR SUMMARIZATION/ANALYSIS/REVIEW:`,
    `- You MUST read the content from the file at ${rawOutputPath} in sequential chunks until 100% of the content has been read.`,
  ].join('\n')

  const truncWarn = maxReadLength
    ? `- If you receive truncation warnings when reading the file ("[N lines truncated]"), reduce the chunk size until you have read 100% of the content without truncation. Bash output is limited to ${maxReadLength.toLocaleString()} chars.\n`
    : `- If you receive truncation warnings when reading the file, reduce the chunk size until you have read 100% of the content without truncation.\n`

  const completion = `- Before producing ANY summary or analysis, you MUST explicitly describe what portion of the content you have read. If you did not read the entire content, you MUST explicitly state this.\n`

  return base + '\n' + truncWarn + completion
}

/**
 * Get a safe blob message for binary content that can't be persisted.
 */
export function getBinaryBlobSavedMessage(filePath: string, size: number): string {
  return `Binary content (${formatFileSize(size)}) saved to: ${filePath}`
}

// ─── Persistence ──────────────────────────────────────────────────────────────

function getMcpOutputStorageDir(): string {
  return join(homedir(), '.qiling', 'sessions', String(process.pid), 'mcp-output')
}

let _dirCreated = false

async function ensureMcpOutputDir(): Promise<void> {
  if (_dirCreated) return
  await mkdir(getMcpOutputStorageDir(), { recursive: true })
  _dirCreated = true
}

/**
 * Persist large MCP output to disk.
 * Returns the file path where the content was saved.
 */
export async function persistMcpOutput(
  content: string,
  toolUseId: string,
  mimeType?: string,
): Promise<string> {
  await ensureMcpOutputDir()
  const ext = extensionForMimeType(mimeType)
  const filePath = join(getMcpOutputStorageDir(), `${toolUseId}.${ext}`)
  try {
    await writeFile(filePath, content, { encoding: 'utf-8', flag: 'wx' })
  } catch (err) {
    if ((err as { code?: string }).code !== 'EEXIST') throw err
  }
  return filePath
}
