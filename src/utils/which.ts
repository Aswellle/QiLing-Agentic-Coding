/**
 * Command path detection — ported from CC's utils/which.ts
 *
 * Uses Bun.which when available (fast, no subprocess),
 * otherwise falls back to spawning the platform-appropriate command.
 */

async function whichFallback(command: string): Promise<string | null> {
  try {
    if (process.platform === 'win32') {
      const proc = Bun.spawn(['where.exe', command], { stdout: 'pipe', stderr: 'pipe' })
      await proc.exited
      if (proc.exitCode !== 0) return null
      const stdout = await new Response(proc.stdout).text()
      return stdout.trim().split(/\r?\n/)[0] ?? null
    }
    const proc = Bun.spawn(['which', command], { stdout: 'pipe', stderr: 'pipe' })
    await proc.exited
    if (proc.exitCode !== 0) return null
    return (await new Response(proc.stdout).text()).trim() || null
  } catch {
    return null
  }
}

function whichFallbackSync(command: string): string | null {
  try {
    if (process.platform === 'win32') {
      const proc = Bun.spawnSync(['where.exe', command], { stdout: 'pipe', stderr: 'pipe' })
      if (proc.exitCode !== 0) return null
      return proc.stdout.toString().trim().split(/\r?\n/)[0] ?? null
    }
    const proc = Bun.spawnSync(['which', command], { stdout: 'pipe', stderr: 'pipe' })
    if (proc.exitCode !== 0) return null
    return proc.stdout.toString().trim() || null
  } catch {
    return null
  }
}

const bunWhich = typeof Bun !== 'undefined' && typeof Bun.which === 'function' ? Bun.which : null

/**
 * Find the full path to a command executable.
 * Uses Bun.which when in Bun runtime (fast, no subprocess).
 * Returns null if not found.
 */
export const which: (command: string) => Promise<string | null> = bunWhich
  ? async command => bunWhich(command) ?? null
  : whichFallback

/**
 * Synchronous version of `which`.
 * Returns null if not found.
 */
export const whichSync: (command: string) => string | null = bunWhich
  ? command => bunWhich(command) ?? null
  : whichFallbackSync
