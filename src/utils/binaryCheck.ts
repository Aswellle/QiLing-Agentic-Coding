/**
 * Binary/command availability check — direct port of CC's utils/binaryCheck.ts
 *
 * Session-cached binary detection used by LSP server auto-detection,
 * computer use platform checks, and /doctor diagnostics.
 */

import { which } from './which'

const binaryCache = new Map<string, boolean>()

/**
 * Check if a binary/command is installed and available on the system.
 * Results are cached for the duration of the session.
 *
 * @param command The command name to check (e.g. 'gopls', 'rust-analyzer')
 * @returns true if the command exists in PATH
 */
export async function isBinaryInstalled(command: string): Promise<boolean> {
  if (!command?.trim()) return false
  const trimmed = command.trim()

  const cached = binaryCache.get(trimmed)
  if (cached !== undefined) return cached

  const found = Boolean(await which(trimmed).catch(() => null))
  binaryCache.set(trimmed, found)
  return found
}

/**
 * Synchronous binary check (uses Bun.which directly).
 * Less accurate than isBinaryInstalled() on non-Bun runtimes.
 */
export function isBinaryInstalledSync(command: string): boolean {
  if (!command?.trim()) return false
  const trimmed = command.trim()

  const cached = binaryCache.get(trimmed)
  if (cached !== undefined) return cached

  const found = Boolean(
    typeof Bun !== 'undefined' && Bun.which ? Bun.which(trimmed) : null
  )
  binaryCache.set(trimmed, found)
  return found
}

/** Clear the binary check cache */
export function clearBinaryCache(): void {
  binaryCache.clear()
}
