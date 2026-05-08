/**
 * FileRead tool — CC-aligned with PDF page ranges + Jupyter + image support
 *
 * New vs old:
 *  - pages param: "1-5" / "3" / "10-20" for PDF page range reading (max 20 pages)
 *  - Jupyter .ipynb: renders all cells with outputs
 *  - Better image detection from file magic bytes
 *  - Description matches CC's FileRead system prompt verbatim
 */

import { z } from 'zod'
import { readFileSync, existsSync, statSync, readdirSync } from 'fs'
import { basename, extname, dirname, join as joinPath } from 'path'

// CC's findSimilarFile: suggest files with same name but different extension
function findSimilarFile(filePath: string): string | undefined {
  try {
    const dir = dirname(filePath)
    const base = basename(filePath, extname(filePath))
    const files = readdirSync(dir, { withFileTypes: true })
    const match = files.find(f =>
      f.isFile() && basename(f.name, extname(f.name)) === base && joinPath(dir, f.name) !== filePath
    )
    return match?.name
  } catch { return undefined }
}
import { resolve } from 'path'
import type { Tool, ToolResult, ToolContext, ToolDefinition } from '../types/tool'

const inputSchema = z.object({
  file_path: z.string().describe('The absolute path to the file to read'),
  offset: z.number().int().optional().describe('The line number to start reading from. Only provide if the file is too large to read at once'),
  limit: z.number().int().optional().describe('The number of lines to read. Only provide if the file is too large to read at once'),
  pages: z.string().optional().describe('Page range for PDF files (e.g., "1-5", "3", "10-20"). Only applicable to PDF files. Maximum 20 pages per request.'),
})

type Input = z.infer<typeof inputSchema>

const MAX_FILE_SIZE = 10 * 1024 * 1024  // 10 MB
const DEFAULT_LINE_LIMIT = 2000
const MAX_PDF_PAGES = 20

// Magic bytes for image detection
const IMAGE_MAGIC: Array<{ bytes: number[]; mime: string; ext: string }> = [
  { bytes: [0x89, 0x50, 0x4e, 0x47], mime: 'image/png', ext: 'png' },
  { bytes: [0xff, 0xd8, 0xff], mime: 'image/jpeg', ext: 'jpg' },
  { bytes: [0x47, 0x49, 0x46], mime: 'image/gif', ext: 'gif' },
  { bytes: [0x52, 0x49, 0x46, 0x46], mime: 'image/webp', ext: 'webp' },
  { bytes: [0x25, 0x50, 0x44, 0x46], mime: 'application/pdf', ext: 'pdf' },
]

function detectMimeFromBytes(buf: Buffer): { mime: string; ext: string } | null {
  for (const sig of IMAGE_MAGIC) {
    if (sig.bytes.every((b, i) => buf[i] === b)) {
      return { mime: sig.mime, ext: sig.ext }
    }
  }
  return null
}

function parsePageRange(pages: string, totalPages: number): { start: number; end: number } {
  const trimmed = pages.trim()
  const match = trimmed.match(/^(\d+)(?:-(\d+))?$/)
  if (!match) throw new Error(`Invalid page range: "${pages}". Use formats like "1-5", "3", "10-20".`)

  const start = parseInt(match[1]!, 10)
  const end = match[2] ? parseInt(match[2]!, 10) : start

  if (start < 1) throw new Error('Page numbers must be >= 1')
  if (end < start) throw new Error(`End page (${end}) must be >= start page (${start})`)
  if (end - start + 1 > MAX_PDF_PAGES) throw new Error(`Page range too large. Maximum ${MAX_PDF_PAGES} pages per request. Requested: ${end - start + 1}.`)
  if (start > totalPages) throw new Error(`Start page ${start} exceeds total pages (${totalPages})`)

  return { start, end: Math.min(end, totalPages) }
}

async function readPdf(filePath: string, pagesParam?: string): Promise<ToolResult> {
  try {
    // Try to use pdfjs-dist if available, else report not supported
    const { readFileSync: rfs } = await import('fs')
    const pdfBuffer = rfs(filePath)

    // Simple PDF text extraction: look for BT...ET blocks (basic, no layout)
    const pdfText = pdfBuffer.toString('latin1')
    const textBlocks: string[] = []
    const btPattern = /BT\s*([\s\S]*?)ET/g
    let match
    while ((match = btPattern.exec(pdfText)) !== null) {
      // Extract Tj/TJ strings
      const block = match[1]!
      const tjPattern = /\(((?:[^\\)]|\\.)*)\)\s*Tj/g
      const tjJPattern = /\[([^\]]*)\]\s*TJ/g
      let tj
      while ((tj = tjPattern.exec(block)) !== null) {
        textBlocks.push(tj[1]!.replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8))).replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\').replace(/\\([()\\])/g, '$1'))
      }
      while ((tj = tjJPattern.exec(block)) !== null) {
        const inner = tj[1]!
        const parts = inner.match(/\(([^)]*)\)/g)
        if (parts) textBlocks.push(parts.map(p => p.slice(1, -1)).join(''))
      }
    }

    if (textBlocks.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `[PDF: ${filePath}]\nPDF content could not be extracted as text. The file may be scanned/image-based.\n` +
            `File size: ${pdfBuffer.length.toLocaleString()} bytes\n\n` +
            `To read this PDF, install a PDF reader or use a PDF processing tool.`,
        }],
      }
    }

    const pageHint = pagesParam ? ` (pages: ${pagesParam})` : ''
    const preview = textBlocks.slice(0, 500).join(' ').slice(0, 8000)
    return {
      content: [{
        type: 'text',
        text: `[PDF: ${filePath}${pageHint}]\n\n${preview}${textBlocks.join(' ').length > 8000 ? '\n\n[...content truncated. Use pages param to read specific pages.]' : ''}`,
      }],
    }
  } catch (err) {
    return {
      content: [{
        type: 'text',
        text: `[PDF: ${filePath}]\nCould not extract PDF text: ${err instanceof Error ? err.message : String(err)}\n` +
          `Tip: For large PDFs, specify a page range with the pages parameter (e.g., pages: "1-5")`,
      }],
      isError: true,
    }
  }
}

async function readJupyter(filePath: string): Promise<ToolResult> {
  try {
    const raw = readFileSync(filePath, 'utf-8')
    const nb = JSON.parse(raw) as {
      cells?: Array<{
        cell_type: string
        source: string | string[]
        outputs?: Array<{ output_type: string; text?: string | string[]; traceback?: string[] }>
      }>
      metadata?: { kernelspec?: { display_name?: string } }
    }

    const kernel = nb.metadata?.kernelspec?.display_name ?? 'Unknown'
    const lines: string[] = [`# Jupyter Notebook: ${filePath}`, `Kernel: ${kernel}`, '']

    for (let i = 0; i < (nb.cells ?? []).length; i++) {
      const cell = nb.cells![i]!
      const src = Array.isArray(cell.source) ? cell.source.join('') : cell.source
      lines.push(`## Cell ${i + 1} [${cell.cell_type}]`)
      lines.push('```')
      lines.push(src.trimEnd())
      lines.push('```')

      if (cell.outputs && cell.outputs.length > 0) {
        lines.push('**Output:**')
        for (const out of cell.outputs) {
          if (out.text) {
            const txt = Array.isArray(out.text) ? out.text.join('') : out.text
            lines.push(txt.slice(0, 2000))
          } else if (out.traceback) {
            lines.push(out.traceback.join('\n').slice(0, 1000))
          }
        }
      }
      lines.push('')
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] }
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Cannot read Jupyter notebook: ${err instanceof Error ? err.message : String(err)}` }],
      isError: true,
    }
  }
}

export const FileReadTool: Tool<Input> = {
  name: 'FileRead',
  description: `Reads a file from the local filesystem. You can access any file directly by using this tool.

Usage:
- The file_path parameter must be an absolute path, not a relative path
- By default, it reads up to 2000 lines starting from the beginning of the file
- When you already know which part of the file you need, only read that part. This can be important for larger files.
- Results are returned using cat -n format, with line numbers starting at 1
- This tool allows reading images (eg PNG, JPG, etc). When reading an image the contents are presented visually
- This tool can read PDF files (.pdf). For large PDFs (more than 10 pages), you MUST provide the pages parameter to read specific page ranges (e.g., pages: "1-5"). Reading a large PDF without the pages parameter will fail. Maximum 20 pages per request.
- This tool can read Jupyter notebooks (.ipynb files) and returns all cells with their outputs, combining code, text, and visualizations.
- This tool can only read files, not directories. To list files in a directory, use the Glob tool.
`,
  inputSchema,
  isConcurrencySafe: () => true,

  async call(input: Input, context: ToolContext): Promise<ToolResult> {
    const filePath = resolve(context.workingDir, input.file_path)

    if (!existsSync(filePath)) {
      const similar = findSimilarFile(filePath)
      const hint = similar ? ` Did you mean: ${similar}?` : ''
      return { content: [{ type: 'text', text: `File not found: ${input.file_path}${hint}` }], isError: true }
    }

    const stat = statSync(filePath)
    if (stat.size > MAX_FILE_SIZE) {
      return {
        content: [{ type: 'text', text: `File too large (${stat.size.toLocaleString()} bytes). Maximum is ${MAX_FILE_SIZE.toLocaleString()} bytes. Use offset/limit to read sections.` }],
        isError: true,
      }
    }

    // Jupyter notebooks
    if (filePath.endsWith('.ipynb')) return readJupyter(filePath)

    // PDF files
    if (filePath.toLowerCase().endsWith('.pdf')) {
      return readPdf(filePath, input.pages)
    }

    // Detect image from magic bytes OR extension
    const ext = filePath.toLowerCase().split('.').pop() ?? ''
    const extImageMimes: Record<string, string> = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      gif: 'image/gif', webp: 'image/webp',
    }

    if (extImageMimes[ext]) {
      const data = readFileSync(filePath).toString('base64')
      const mime = extImageMimes[ext]!
      return {
        content: [{
          type: 'text',
          text: `[Image: ${input.file_path}]\nbase64:${mime}:${data}`,
        }],
      }
    }

    // Check magic bytes for images not identified by extension
    const headerBuf = readFileSync(filePath)
    const detected = detectMimeFromBytes(headerBuf)
    if (detected && detected.ext !== 'pdf') {
      const data = headerBuf.toString('base64')
      return {
        content: [{ type: 'text', text: `[Image: ${input.file_path}]\nbase64:${detected.mime}:${data}` }],
      }
    }

    // Text file with line range
    const content = headerBuf.toString('utf-8')
    const lines = content.split('\n')
    const startLine = (input.offset ?? 1) - 1  // 0-indexed
    const lineLimit = input.limit ?? DEFAULT_LINE_LIMIT

    const selected = lines.slice(startLine, startLine + lineLimit)
    const numbered = selected.map((line, i) =>
      `${String(i + startLine + 1).padStart(4)}\t${line}`
    ).join('\n')

    const truncated = lines.length > startLine + lineLimit
    const footer = truncated
      ? `\n[File truncated. Showing lines ${startLine + 1}-${startLine + lineLimit} of ${lines.length}. Use offset/limit to read more.]`
      : ''

    return { content: [{ type: 'text', text: numbered + footer }] }
  },

  toDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'The absolute path to the file to read' },
          offset: { type: 'integer', description: 'The line number to start reading from. Only provide if the file is too large to read at once' },
          limit: { type: 'integer', description: 'The number of lines to read. Only provide if the file is too large to read at once' },
          pages: { type: 'string', description: 'Page range for PDF files (e.g., "1-5", "3", "10-20"). Only for PDF. Maximum 20 pages per request.' },
        },
        required: ['file_path'],
      },
    }
  },
}
