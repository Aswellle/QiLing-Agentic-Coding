/**
 * Paste content cache — adapted from CC's utils/pasteStore.ts
 *
 * Persists large pasted content to disk by content hash, so the chat history
 * only stores the hash instead of the full paste body. Large pastes (images,
 * code blobs) stay accessible across sessions without bloating the JSONL.
 *
 * hashPastedText(content): → 16-char SHA-256 prefix (synchronous)
 * storePastedText(hash, content): persist to ~/.qiling/paste-cache/<hash>.txt
 * retrievePastedText(hash): read back by hash (null if not found)
 * cleanupOldPastes(cutoffDate): time-based cleanup of stale paste files
 */

import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getGlobalConfigDir } from '../settings/loader.js'
import { logForDebugging } from './log.js'
import { isENOENT } from './errors.js'

const PASTE_STORE_DIR = 'paste-cache'

function getPasteStoreDir(): string {
  return join(getGlobalConfigDir(), PASTE_STORE_DIR)
}

/**
 * Generate a content hash for paste storage.
 * Synchronous — callers can use the hash immediately before the async disk write.
 */
export function hashPastedText(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16)
}

function getPastePath(hash: string): string {
  return join(getPasteStoreDir(), `${hash}.txt`)
}

/**
 * Persist pasted text to disk. Pre-compute the hash with hashPastedText().
 */
export async function storePastedText(hash: string, content: string): Promise<void> {
  const pasteDir = getPasteStoreDir()
  await mkdir(pasteDir, { recursive: true })
  const pastePath = getPastePath(hash)
  try {
    await writeFile(pastePath, content, { encoding: 'utf8', flag: 'wx' })
  } catch (error) {
    if ((error as { code?: string }).code !== 'EEXIST') throw error
  }
}

/**
 * Retrieve pasted text by hash. Returns null if not found.
 */
export async function retrievePastedText(hash: string): Promise<string | null> {
  try {
    return await readFile(getPastePath(hash), { encoding: 'utf8' })
  } catch (error) {
    if (!isENOENT(error)) {
      logForDebugging(`Failed to retrieve paste ${hash}: ${error}`)
    }
    return null
  }
}

/**
 * Remove paste files older than cutoffDate.
 */
export async function cleanupOldPastes(cutoffDate: Date): Promise<void> {
  const pasteDir = getPasteStoreDir()
  let files: string[]
  try {
    files = await readdir(pasteDir)
  } catch {
    return
  }

  const cutoffTime = cutoffDate.getTime()
  for (const file of files) {
    if (!file.endsWith('.txt')) continue
    const filePath = join(pasteDir, file)
    try {
      const stats = await stat(filePath)
      if (stats.mtimeMs < cutoffTime) {
        await unlink(filePath)
        logForDebugging(`Cleaned up old paste: ${filePath}`)
      }
    } catch { /* ignore individual file errors */ }
  }
}
