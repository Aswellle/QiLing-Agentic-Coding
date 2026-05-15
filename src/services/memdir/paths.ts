/**
 * Memory directory path helpers.
 * Uses CC-compatible project slug pattern: ~/.qiling/projects/<slug>/memory/
 */

import { join, resolve } from 'path'
import { homedir } from 'os'

export const MEMORY_DIR_NAME = 'memory'
export const GLOBAL_MEMORY_DIR = join(homedir(), '.qiling', MEMORY_DIR_NAME)

/**
 * Get the auto-memory path for the current project.
 * Uses ~/.qiling/projects/<slug>/memory/ pattern (CC-compatible).
 * Slug is derived from the working directory path.
 */
export function getAutoMemPath(workingDir?: string): string {
  // Check env override first
  const envOverride = process.env.QILING_MEMORY_PATH
  if (envOverride) return resolve(envOverride)

  if (workingDir) {
    // Create a slug from the working directory path (CC's pattern: replace / and \ with -)
    const slug = workingDir.replace(/[/\\:]/g, '-').replace(/^-+|-+$/g, '')
    return join(homedir(), '.qiling', 'projects', slug, MEMORY_DIR_NAME)
  }

  return GLOBAL_MEMORY_DIR
}

export function isAutoMemoryEnabled(settings?: { autoMemoryEnabled?: boolean }): boolean {
  if (process.env.QILING_DISABLE_AUTO_MEMORY === '1') return false
  if (settings?.autoMemoryEnabled === false) return false
  return true
}

export async function ensureMemoryDirExists(memoryDir: string): Promise<void> {
  const { mkdir } = await import('fs/promises')
  try {
    await mkdir(memoryDir, { recursive: true })
  } catch {
    // ignore EEXIST and other benign errors
  }
}
