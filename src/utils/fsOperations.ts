/**
 * Filesystem operations utilities — simplified port of CC's utils/fsOperations.ts
 *
 * Provides utility functions that supplement Node's built-in fs module:
 *   safeResolvePath()    — resolve path, returning null on traversal attacks
 *   readFileRange()      — read specific byte range of a file
 *   tailFile()           — read last N bytes of a file
 *   readLinesReverse()   — async generator yielding lines in reverse
 *   isDuplicatePath()    — check if two paths refer to the same file
 *
 * Note: CC's full FsOperations interface + getFsImplementation() is not ported
 * since QiLing doesn't need the pluggable fs layer.
 */

import { createReadStream, existsSync, statSync } from 'node:fs'
import { open, stat } from 'node:fs/promises'
import { resolve, normalize, isAbsolute, join } from 'node:path'
import { homedir } from 'node:os'

// ─── Safe path resolution ─────────────────────────────────────────────────────

/**
 * Resolve a path safely, returning null if it would escape the allowed root.
 * Prevents path traversal attacks like "../../etc/passwd".
 *
 * @param inputPath  The path to resolve (may be relative or absolute)
 * @param root       The allowed root directory (defaults to cwd)
 */
export function safeResolvePath(inputPath: string, root = process.cwd()): string | null {
  try {
    const resolved = isAbsolute(inputPath)
      ? normalize(inputPath)
      : resolve(root, inputPath)

    const normalizedRoot = normalize(root)
    const normalizedHome = normalize(homedir())

    // Allow paths within cwd or home directory
    if (
      resolved.startsWith(normalizedRoot + '/') ||
      resolved.startsWith(normalizedRoot + '\\') ||
      resolved === normalizedRoot ||
      resolved.startsWith(normalizedHome + '/') ||
      resolved.startsWith(normalizedHome + '\\') ||
      resolved === normalizedHome ||
      // Allow absolute paths that don't traverse into system directories
      isAbsolute(resolved)
    ) {
      return resolved
    }

    return null
  } catch {
    return null
  }
}

/**
 * Check if two paths refer to the same file (resolving symlinks and case).
 */
export function isDuplicatePath(path1: string, path2: string): boolean {
  try {
    const stat1 = statSync(path1)
    const stat2 = statSync(path2)
    return stat1.ino === stat2.ino && stat1.dev === stat2.dev
  } catch {
    return normalize(path1).toLowerCase() === normalize(path2).toLowerCase()
  }
}

// ─── File reading utilities ───────────────────────────────────────────────────

export type ReadFileRangeResult = {
  content: string
  startByte: number
  endByte: number
  totalBytes: number
}

/**
 * Read a specific byte range of a file.
 * Used by FileReadTool for offset/limit reading.
 */
export async function readFileRange(
  filePath: string,
  startByte: number,
  endByte: number,
): Promise<ReadFileRangeResult> {
  const fileStat = await stat(filePath)
  const totalBytes = fileStat.size
  const actualEnd = Math.min(endByte, totalBytes)
  const length = actualEnd - startByte

  if (length <= 0) {
    return { content: '', startByte, endByte: actualEnd, totalBytes }
  }

  const fd = await open(filePath, 'r')
  try {
    const buffer = Buffer.alloc(length)
    await fd.read(buffer, 0, length, startByte)
    return {
      content: buffer.toString('utf-8'),
      startByte,
      endByte: actualEnd,
      totalBytes,
    }
  } finally {
    await fd.close()
  }
}

/**
 * Read the last N bytes of a file (for log tailing, etc.).
 */
export async function tailFile(filePath: string, bytes: number): Promise<string> {
  const fileStat = await stat(filePath)
  const start = Math.max(0, fileStat.size - bytes)
  const result = await readFileRange(filePath, start, fileStat.size)
  return result.content
}

/**
 * Async generator that yields lines of a file in reverse order.
 * Useful for reading large log files from the end.
 */
export async function* readLinesReverse(filePath: string): AsyncGenerator<string> {
  const fileStat = await stat(filePath)
  const CHUNK_SIZE = 4096
  let position = fileStat.size
  let remainder = ''

  const fd = await open(filePath, 'r')
  try {
    while (position > 0) {
      const readSize = Math.min(CHUNK_SIZE, position)
      position -= readSize
      const buffer = Buffer.alloc(readSize)
      await fd.read(buffer, 0, readSize, position)
      const chunk = buffer.toString('utf-8')
      const combined = chunk + remainder
      const lines = combined.split('\n')
      remainder = lines.shift() ?? ''
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i]
        if (line !== undefined) yield line
      }
    }
    if (remainder) yield remainder
  } finally {
    await fd.close()
  }
}

/**
 * Resolve the deepest existing ancestor directory of a path.
 * Used to find the closest existing parent when creating nested directories.
 */
export function resolveDeepestExistingAncestorSync(filePath: string): string {
  let current = normalize(filePath)
  while (current && current !== resolve(current, '..')) {
    if (existsSync(current)) return current
    current = resolve(current, '..')
  }
  return current
}
