/**
 * File system utilities — ported from CC's utils/file.ts (portable subset)
 *
 * convertLeadingTabsToSpaces(), normalizePathForComparison(), pathsEqual(),
 * getFileModificationTime(), readFileSafe(), isDirEmpty()
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
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
