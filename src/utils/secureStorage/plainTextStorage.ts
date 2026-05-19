/**
 * Plaintext credential storage — adapted from CC's utils/secureStorage/plainTextStorage.ts
 *
 * Stores credentials in ~/.qiling/.credentials.json with chmod 600.
 * Used as fallback when no OS keychain is available.
 */

import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { readFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import type { SecureStorage, SecureStorageData } from './types.js'

function getStoragePath(): { storageDir: string; storagePath: string } {
  const storageDir = join(homedir(), '.qiling')
  return { storageDir, storagePath: join(storageDir, '.credentials.json') }
}

function safeParse(data: string): SecureStorageData | null {
  try { return JSON.parse(data) } catch { return null }
}

export const plainTextStorage: SecureStorage = {
  name: 'plaintext',

  read(): SecureStorageData | null {
    const { storagePath } = getStoragePath()
    try { return safeParse(readFileSync(storagePath, 'utf8')) }
    catch { return null }
  },

  async readAsync(): Promise<SecureStorageData | null> {
    const { storagePath } = getStoragePath()
    try { return safeParse(await readFile(storagePath, 'utf8')) }
    catch { return null }
  },

  update(data: SecureStorageData): { success: boolean; warning?: string } {
    try {
      const { storageDir, storagePath } = getStoragePath()
      if (!existsSync(storageDir)) mkdirSync(storageDir, { recursive: true })
      writeFileSync(storagePath, JSON.stringify(data, null, 2), { encoding: 'utf8' })
      chmodSync(storagePath, 0o600)
      return { success: true, warning: 'Warning: Storing credentials in plaintext.' }
    } catch {
      return { success: false }
    }
  },

  delete(): boolean {
    const { storagePath } = getStoragePath()
    try { unlinkSync(storagePath); return true }
    catch (e: unknown) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return true
      return false
    }
  },
}
