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
import { toError } from './errors.js'
import { formatFileSize } from './format.js'

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
    'application/zip': 'zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/msword': 'doc',
    'application/vnd.ms-excel': 'xls',
    'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/ogg': 'ogg',
    'video/mp4': 'mp4', 'video/webm': 'webm',
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif',
    'image/webp': 'webp', 'image/svg+xml': 'svg',
  }
  return MIME_MAP[mt] ?? 'bin'
}

// FROM CC: isBinaryContentType — heuristic: text/*, json, xml, form-urlencoded = non-binary
export function isBinaryContentType(contentType: string): boolean {
  if (!contentType) return false
  const mt = (contentType.split(';')[0] ?? '').trim().toLowerCase()
  if (mt.startsWith('text/')) return false
  if (mt.endsWith('+json') || mt === 'application/json') return false
  if (mt.endsWith('+xml') || mt === 'application/xml') return false
  if (mt.startsWith('application/javascript')) return false
  if (mt === 'application/x-www-form-urlencoded') return false
  return true
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

// FROM CC: getBinaryBlobSavedMessage — human-readable note about where binary was saved
export function getBinaryBlobSavedMessage(
  filepath: string,
  mimeType: string | undefined,
  size: number,
  sourceDescription: string,
): string {
  const mt = mimeType || 'unknown type'
  return `${sourceDescription}Binary content (${mt}, ${formatFileSize(size)}) saved to ${filepath}`
}

export type PersistBinaryResult =
  | { filepath: string; size: number; ext: string }
  | { error: string }

// FROM CC: persistBinaryContent — write raw binary to tool-results dir with mime-derived extension
export async function persistBinaryContent(
  bytes: Buffer,
  mimeType: string | undefined,
  persistId: string,
): Promise<PersistBinaryResult> {
  await ensureMcpOutputDir()
  const ext = extensionForMimeType(mimeType)
  const filepath = join(getMcpOutputStorageDir(), `${persistId}.${ext}`)
  try {
    await writeFile(filepath, bytes)
  } catch (error) {
    const err = toError(error)
    return { error: err.message }
  }
  return { filepath, size: bytes.length, ext }
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
