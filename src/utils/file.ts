/**
 * File system utilities — ported from CC's utils/file.ts (portable subset)
 *
 * convertLeadingTabsToSpaces(), normalizePathForComparison(), pathsEqual(),
 * getFileModificationTime(), readFileSafe(), isDirEmpty()
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { stat } from 'fs/promises'
import { normalize, relative } from 'path'
import { getPlatform } from './platform'

/** Convert leading tabs to 2-space indents. Fast path for tab-free content. */
export function convertLeadingTabsToSpaces(content: string): string {
  if (!content.includes('\t')) return content
  return content.replace(/^\t+/gm, _ => '  '.repeat(_.length))
}

/** Normalize path for comparison (Windows: lowercase + backslashes). */
export function normalizePathForComparison(filePath: string): string {
  let normalized = normalize(filePath)
  if (getPlatform() === 'windows') {
    normalized = normalized.replace(/\//g, '\\').toLowerCase()
  }
  return normalized
}

/** Compare two file paths, handling Windows case-insensitivity. */
export function pathsEqual(path1: string, path2: string): boolean {
  return normalizePathForComparison(path1) === normalizePathForComparison(path2)
}

/** Get file modification time in ms. Returns 0 if file doesn't exist. */
export function getFileModificationTime(filePath: string): number {
  try { return statSync(filePath).mtimeMs } catch { return 0 }
}

/** Read a file safely, returning null on any error. */
export function readFileSafe(filePath: string): string | null {
  try { return readFileSync(filePath, 'utf-8') } catch { return null }
}

/** Returns true if directory exists and is empty. */
export function isDirEmpty(dirPath: string): boolean {
  try { return readdirSync(dirPath).length === 0 }
  catch { return false }
}

/** True if the file exists. Async version for use in streams. */
export async function pathExists(path: string): Promise<boolean> {
  return existsSync(path)
}

/** Get display path (relative if under cwd, else absolute). */
export function getDisplayPath(filePath: string, cwd = process.cwd()): string {
  try {
    const rel = relative(cwd, filePath)
    return rel.startsWith('..') ? filePath : rel
  } catch { return filePath }
}


/** Maximum output size in bytes for shell/file tool results (0.25MB). Mirrors CC's MAX_OUTPUT_SIZE. */
export const MAX_OUTPUT_SIZE = 0.25 * 1024 * 1024

/** Text prepended when a file/dir is not found to help orient the model. Mirrors CC's FILE_NOT_FOUND_CWD_NOTE. */
export const FILE_NOT_FOUND_CWD_NOTE = 'Note: your current working directory is'

// FROM CC: async modification time (avoids blocking event loop on slow/network disks)
export async function getFileModificationTimeAsync(filePath: string): Promise<number> {
  const s = await stat(filePath)
  return Math.floor(s.mtimeMs)
}

// FROM CC: addLineNumbers / stripLineNumberPrefix — compact N\t format (no GrowthBook killswitch)
export function addLineNumbers({ content, startLine }: { content: string; startLine: number }): string {
  if (!content) return ''
  return content.split(/\r?\n/)
    .map((line, index) => `${index + startLine}\t${line}`)
    .join('\n')
}

export function stripLineNumberPrefix(line: string): string {
  const match = line.match(/^\s*\d+[→\t](.*)$/)
  return match?.[1] ?? line
}

// FROM CC: isFileWithinReadSizeLimit
export function isFileWithinReadSizeLimit(filePath: string, maxSizeBytes: number = MAX_OUTPUT_SIZE): boolean {
  try { return statSync(filePath).size <= maxSizeBytes } catch { return false }
}
