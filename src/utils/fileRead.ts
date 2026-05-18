/**
 * Sync file-read path — adapted from CC's utils/fileRead.ts
 *
 * Leaf module that avoids importing from file.ts (which pulls in the full
 * log.ts → message.ts → Tool.ts SCC). Callers that need detectFileEncoding
 * with logError wrappers import from file.ts; this provides the pure subset.
 *
 * detectEncodingForResolvedPath: byte-sniff BOM/magic bytes
 * detectLineEndingsForString: count CRLF vs LF
 * readFileSyncWithMetadata: one-pass read returning content + encoding + endings
 * readFileSync: drop-in for fs.readFileSync that CRLF-normalizes
 */

import { readFileSync as fsReadFileSync, openSync, readSync, closeSync } from 'node:fs'
import { normalize, isAbsolute, resolve } from 'node:path'

export type LineEndingType = 'CRLF' | 'LF'

function readBytes(resolvedPath: string, length: number): { buffer: Buffer; bytesRead: number } {
  const buf = Buffer.alloc(length)
  const fd = openSync(resolvedPath, 'r')
  try {
    const bytesRead = readSync(fd, buf, 0, length, 0)
    return { buffer: buf, bytesRead }
  } finally {
    closeSync(fd)
  }
}

export function detectEncodingForResolvedPath(resolvedPath: string): BufferEncoding {
  const { buffer, bytesRead } = readBytes(resolvedPath, 4096)

  // Empty files → utf8 (prevents emoji/CJK corruption on first write)
  if (bytesRead === 0) return 'utf8'

  // UTF-16 LE BOM: FF FE
  if (bytesRead >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) return 'utf16le'

  // UTF-8 BOM: EF BB BF
  if (bytesRead >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return 'utf8'
  }

  return 'utf8'
}

export function detectLineEndingsForString(content: string): LineEndingType {
  let crlfCount = 0
  let lfCount = 0

  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') {
      if (i > 0 && content[i - 1] === '\r') {
        crlfCount++
      } else {
        lfCount++
      }
    }
  }

  return crlfCount > lfCount ? 'CRLF' : 'LF'
}

/**
 * Like readFileSync but returns encoding and original line ending style in one
 * filesystem pass. FileEditTool uses this to round-trip line endings correctly.
 */
export function readFileSyncWithMetadata(filePath: string): {
  content: string
  encoding: BufferEncoding
  lineEndings: LineEndingType
} {
  const resolvedPath = isAbsolute(filePath) ? normalize(filePath) : resolve(filePath)
  const encoding = detectEncodingForResolvedPath(resolvedPath)
  const raw = fsReadFileSync(resolvedPath, { encoding })
  const lineEndings = detectLineEndingsForString(raw.slice(0, 4096))
  return {
    content: raw.replaceAll('\r\n', '\n'),
    encoding,
    lineEndings,
  }
}

export function readFileSync(filePath: string): string {
  return readFileSyncWithMetadata(filePath).content
}
