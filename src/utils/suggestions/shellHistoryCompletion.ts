/**
 * Shell history completion — adapted from CC's utils/suggestions/shellHistoryCompletion.ts
 *
 * Provides autocomplete for ! commands by reading from session history.
 * Caches results for 60s (history only changes on submit, not while typing).
 */

import { logForDebugging } from '../log.js'

export type ShellHistoryMatch = {
  /** The full command from history */
  fullCommand: string
  /** The suffix to display as ghost text (the part after user's input) */
  suffix: string
}

let shellHistoryCache: string[] | null = null
let shellHistoryCacheTimestamp = 0
const CACHE_TTL_MS = 60_000

async function getShellHistoryCommands(): Promise<string[]> {
  const now = Date.now()
  if (shellHistoryCache && now - shellHistoryCacheTimestamp < CACHE_TTL_MS) {
    return shellHistoryCache
  }

  const commands: string[] = []
  const seen = new Set<string>()

  try {
    // Try to read from QiLing's bash history / REPL history
    // In QiLing, ! commands are stored in session history files
    // This is a simplified version that returns empty (history integration pending)
    logForDebugging('shellHistoryCompletion: reading from history (stub)')
  } catch (error) {
    logForDebugging(`Failed to read shell history: ${error}`)
  }

  shellHistoryCache = commands
  shellHistoryCacheTimestamp = now
  return commands
}

export function clearShellHistoryCache(): void {
  shellHistoryCache = null
  shellHistoryCacheTimestamp = 0
}

/**
 * Prepend a command to the history cache without invalidating it.
 * Moves existing occurrences to front (dedup).
 */
export function prependToShellHistoryCache(command: string): void {
  if (!shellHistoryCache) return
  const idx = shellHistoryCache.indexOf(command)
  if (idx !== -1) shellHistoryCache.splice(idx, 1)
  shellHistoryCache.unshift(command)
}

/**
 * Find the best matching shell command from history for the given input.
 * Returns null for empty/short input or no match.
 */
export async function getShellHistoryCompletion(
  input: string,
): Promise<ShellHistoryMatch | null> {
  if (!input || input.length < 2) return null
  const trimmedInput = input.trim()
  if (!trimmedInput) return null

  const commands = await getShellHistoryCommands()
  for (const command of commands) {
    if (command.startsWith(input) && command !== input) {
      return { fullCommand: command, suffix: command.slice(input.length) }
    }
  }
  return null
}
