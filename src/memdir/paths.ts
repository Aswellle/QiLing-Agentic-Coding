// FROM CC: memdir/paths.ts (adapt-new stub)
// Full port blocked on growthbook + settings/settings.ts.
// Minimal: getAutoMemEntrypoint + getAutoMemPath for config.ts dependency.
// Uses QiLing's getGlobalConfigDir via settings/loader.
import { join } from 'path'
import { getGlobalConfigDir } from '../settings/loader.js'

export const AUTO_MEM_ENTRYPOINT_NAME = 'MEMORY.md'
const AUTO_MEM_DIR_NAME = 'memory'

/**
 * Returns the auto-memory directory for the current project.
 * Simplified: uses ~/.claude/projects/<sanitized-cwd>/memory/
 */
export function getAutoMemPath(): string {
  return join(getGlobalConfigDir(), AUTO_MEM_DIR_NAME)
}

/**
 * Returns the auto-memory entrypoint (MEMORY.md inside the auto-memory dir).
 */
export function getAutoMemEntrypoint(): string {
  return join(getAutoMemPath(), AUTO_MEM_ENTRYPOINT_NAME)
}

/**
 * Check if auto-memory is enabled (always true in QiLing by default).
 */
export function isAutoMemoryEnabled(): boolean {
  return true
}

/**
 * Check if the given path is within the auto-memory directory.
 */
export function isAutoMemPath(absolutePath: string): boolean {
  return absolutePath.startsWith(getAutoMemPath())
}
