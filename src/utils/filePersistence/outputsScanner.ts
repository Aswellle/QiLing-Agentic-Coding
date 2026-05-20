/**
 * Outputs directory scanner — adapted from CC's utils/filePersistence/outputsScanner.ts
 *
 * Finds files modified since a given timestamp (for turn output tracking).
 * Uses recursive readdir + parallelized lstat, skips symlinks for security.
 * Detects environment kind from CLAUDE_CODE_ENVIRONMENT_KIND env var.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { logForDebugging } from '../log.js'

export type EnvironmentKind = 'byoc' | 'anthropic_cloud'
export type TurnStartTime = number

export function logDebug(message: string): void {
  logForDebugging(`[file-persistence] ${message}`)
}

export function getEnvironmentKind(): EnvironmentKind | null {
  const kind = process.env.CLAUDE_CODE_ENVIRONMENT_KIND
  if (kind === 'byoc' || kind === 'anthropic_cloud') return kind
  return null
}

type DirEntry = { name: string; isFile(): boolean; isDirectory(): boolean; isSymbolicLink(): boolean; parentPath?: string; path?: string }

function getEntryParentPath(entry: DirEntry, fallback: string): string {
  if (entry.parentPath) return entry.parentPath
  if (entry.path) return entry.path
  return fallback
}

export async function findModifiedFiles(turnStartTime: TurnStartTime, outputsDir: string): Promise<string[]> {
  let entries: DirEntry[]
  try {
    entries = await fs.readdir(outputsDir, { withFileTypes: true, recursive: true }) as unknown as DirEntry[]
  } catch {
    return []
  }

  const filePaths: string[] = []
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue
    if (entry.isFile()) {
      const parentPath = getEntryParentPath(entry, outputsDir)
      filePaths.push(path.join(parentPath, entry.name))
    }
  }

  if (filePaths.length === 0) { logDebug('No files found in outputs directory'); return [] }

  const statResults = await Promise.all(
    filePaths.map(async filePath => {
      try {
        const stat = await fs.lstat(filePath)
        if (stat.isSymbolicLink()) return null
        return { filePath, mtimeMs: stat.mtimeMs }
      } catch { return null }
    }),
  )

  const modifiedFiles: string[] = []
  for (const result of statResults) {
    if (result && result.mtimeMs >= turnStartTime) modifiedFiles.push(result.filePath)
  }

  logDebug(`Found ${modifiedFiles.length} modified files since turn start (scanned ${filePaths.length} total)`)
  return modifiedFiles
}
