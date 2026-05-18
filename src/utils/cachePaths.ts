/**
 * Cache path helpers — adapted from CC's utils/cachePaths.ts
 *
 * Provides stable per-project cache directory paths under ~/.qiling/cache/.
 * Uses djb2Hash (not wyhash/Bun.hash) for path names so they remain stable
 * across binary upgrades. Path names must NOT change once created.
 */

import { join } from 'node:path'
import { homedir } from 'node:os'
import { djb2Hash } from './hash.js'

// ~/.qiling/cache plays the role of env-paths('claude-cli').cache in CC
function getBaseCache(): string {
  return join(homedir(), '.qiling', 'cache')
}

const MAX_SANITIZED_LENGTH = 200

// Disk-safe, stable sanitization. Must match CC's behavior (char-class + hash suffix).
function sanitizePath(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9]/g, '-')
  if (sanitized.length <= MAX_SANITIZED_LENGTH) {
    return sanitized
  }
  return `${sanitized.slice(0, MAX_SANITIZED_LENGTH)}-${Math.abs(djb2Hash(name)).toString(36)}`
}

function getProjectDir(cwd: string): string {
  return sanitizePath(cwd)
}

export const CACHE_PATHS = {
  baseLogs: () => join(getBaseCache(), getProjectDir(process.cwd())),
  errors: () => join(getBaseCache(), getProjectDir(process.cwd()), 'errors'),
  messages: () => join(getBaseCache(), getProjectDir(process.cwd()), 'messages'),
  mcpLogs: (serverName: string) =>
    join(
      getBaseCache(),
      getProjectDir(process.cwd()),
      // Sanitize server name for Windows compatibility (colons reserved for drive letters)
      `mcp-logs-${sanitizePath(serverName)}`,
    ),
}
