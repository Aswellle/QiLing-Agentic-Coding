/**
 * BashTool utility functions — adapted from CC's tools/BashTool/utils.ts
 *
 * stripEmptyLines()         — trim leading/trailing blank lines
 * isImageOutput()           — detect data-URI image output
 * parseDataUri()            — parse data:image/...;base64,... URI
 * buildImageToolResult()    — wrap data URI as ToolResultBlockParam image
 * resizeShellImageOutput()  — resize/recompress base64 shell image output
 * formatOutput()            — truncate long output, detect images
 * createContentSummary()    — human-readable MCP result summary
 */

import type {
  Base64ImageSource,
  ContentBlockParam,
  ToolResultBlockParam,
} from '@anthropic-ai/sdk/resources/index.mjs'
import { readFile, stat } from 'node:fs/promises'
import { maybeResizeAndDownsampleImageBuffer } from '../../utils/imageResizer.js'
import { countCharInString, plural } from '../../utils/stringUtils.js'

const MAX_OUTPUT_CHARS = parseInt(process.env.QILING_MAX_OUTPUT_CHARS ?? '', 10) || 100_000
const MAX_IMAGE_FILE_SIZE = 20 * 1024 * 1024

// ─── String utilities ─────────────────────────────────────────────────────────

/**
 * Strip leading/trailing blank-only lines.
 * Unlike trim(), preserves whitespace within content lines.
 */
export function stripEmptyLines(content: string): string {
  const lines = content.split('\n')
  let startIndex = 0
  while (startIndex < lines.length && lines[startIndex]?.trim() === '') startIndex++
  let endIndex = lines.length - 1
  while (endIndex >= 0 && lines[endIndex]?.trim() === '') endIndex--
  if (startIndex > endIndex) return ''
  return lines.slice(startIndex, endIndex + 1).join('\n')
}

// ─── Image detection / parsing ────────────────────────────────────────────────

const DATA_URI_RE = /^data:([^;]+);base64,(.+)$/

export function isImageOutput(content: string): boolean {
  return /^data:image\/[a-z0-9.+_-]+;base64,/i.test(content)
}

export function parseDataUri(s: string): { mediaType: string; data: string } | null {
  const match = s.trim().match(DATA_URI_RE)
  if (!match || !match[1] || !match[2]) return null
  return { mediaType: match[1], data: match[2] }
}

export function buildImageToolResult(
  stdout: string,
  toolUseID: string,
): ToolResultBlockParam | null {
  const parsed = parseDataUri(stdout)
  if (!parsed) return null
  return {
    tool_use_id: toolUseID,
    type: 'tool_result',
    content: [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: parsed.mediaType as Base64ImageSource['media_type'],
          data: parsed.data,
        },
      },
    ],
  }
}

/**
 * Resize image output from a shell tool. If stdout is truncated (because the
 * shell capped it), re-read from the output file on disk to get the full
 * base64 blob before resizing — a truncated base64 decodes to a corrupt image.
 *
 * Also caps dimensions: compressImageBuffer only checks byte size, so a
 * small-but-high-DPI PNG (e.g. matplotlib at dpi=300) could slip through.
 */
export async function resizeShellImageOutput(
  stdout: string,
  outputFilePath?: string,
  outputFileSize?: number,
): Promise<string | null> {
  let source = stdout
  if (outputFilePath) {
    const size = outputFileSize ?? (await stat(outputFilePath)).size
    if (size > MAX_IMAGE_FILE_SIZE) return null
    source = await readFile(outputFilePath, 'utf8')
  }
  const parsed = parseDataUri(source)
  if (!parsed) return null
  const buf = Buffer.from(parsed.data, 'base64')
  const ext = parsed.mediaType.split('/')[1] ?? 'png'
  const resized = await maybeResizeAndDownsampleImageBuffer(buf, buf.length, ext)
  return `data:image/${resized.mediaType};base64,${resized.buffer.toString('base64')}`
}

// ─── Output formatting ────────────────────────────────────────────────────────

export function formatOutput(content: string): {
  totalLines: number
  truncatedContent: string
  isImage?: boolean
} {
  const isImage = isImageOutput(content)
  if (isImage) {
    return { totalLines: 1, truncatedContent: content, isImage }
  }

  if (content.length <= MAX_OUTPUT_CHARS) {
    return {
      totalLines: countCharInString(content, '\n') + 1,
      truncatedContent: content,
      isImage,
    }
  }

  const truncatedPart = content.slice(0, MAX_OUTPUT_CHARS)
  const remainingLines = countCharInString(content, '\n', MAX_OUTPUT_CHARS) + 1
  return {
    totalLines: countCharInString(content, '\n') + 1,
    truncatedContent: `${truncatedPart}\n\n... [${remainingLines} lines truncated] ...`,
    isImage,
  }
}

// ─── MCP content summary ──────────────────────────────────────────────────────

/**
 * Creates a human-readable summary of structured content blocks.
 * Used to display MCP results with mixed text + image content in the UI.
 */
export function createContentSummary(content: ContentBlockParam[]): string {
  const parts: string[] = []
  let textCount = 0
  let imageCount = 0

  for (const block of content) {
    if (block.type === 'image') {
      imageCount++
    } else if (block.type === 'text' && 'text' in block) {
      textCount++
      const preview = block.text.slice(0, 200)
      parts.push(preview + (block.text.length > 200 ? '...' : ''))
    }
  }

  const summary: string[] = []
  if (imageCount > 0) summary.push(`[${imageCount} ${plural(imageCount, 'image')}]`)
  if (textCount > 0) summary.push(`[${textCount} text ${plural(textCount, 'block')}]`)

  return `MCP Result: ${summary.join(', ')}${parts.length > 0 ? '\n\n' + parts.join('\n\n') : ''}`
}
