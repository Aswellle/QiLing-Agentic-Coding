/**
 * Ripgrep integration utilities — adapted from CC's utils/ripgrep.ts
 *
 * Provides a programmatic interface to ripgrep (rg) for use by GrepTool
 * and other components. Uses Bun.which to find rg, falling back to system PATH.
 *
 * CC embeds ripgrep in native builds; QiLing relies on system rg.
 */

import { which } from './which'

// ─── Configuration ────────────────────────────────────────────────────────────

let _rgPath: string | null | undefined = undefined  // undefined = not yet checked

async function getRgPath(): Promise<string | null> {
  if (_rgPath !== undefined) return _rgPath
  _rgPath = await which('rg')
  return _rgPath
}

export class RipgrepTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Ripgrep timed out after ${timeoutMs}ms`)
    this.name = 'RipgrepTimeoutError'
  }
}

export function getRipgrepStatus(): { available: boolean; path: string | null } {
  return {
    available: _rgPath != null,
    path: _rgPath ?? null,
  }
}

// ─── Core execution ───────────────────────────────────────────────────────────

/**
 * Run ripgrep and collect all output lines.
 *
 * @param args Arguments to pass to rg (before the target path)
 * @param target File or directory to search
 * @param signal AbortSignal for cancellation
 * @returns Array of output lines
 */
export async function ripGrep(
  args: string[],
  target: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const rgPath = await getRgPath()
  if (!rgPath) throw new Error('ripgrep (rg) not found in PATH')

  if (signal?.aborted) return []

  const proc = Bun.spawn([rgPath, ...args, target], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const [stdout, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    proc.exited,
  ])

  // rg exit code 1 = no matches (not an error), 2+ = error
  if (exitCode !== null && exitCode >= 2) {
    throw new Error(`ripgrep exited with code ${exitCode}`)
  }

  return stdout.split('\n').map(l => l.endsWith('\r') ? l.slice(0, -1) : l).filter(Boolean)
}

/**
 * Stream ripgrep output line by line.
 * Calls onLines for each batch of lines as they arrive.
 */
export async function ripGrepStream(
  args: string[],
  target: string,
  onLines: (lines: string[]) => void,
  signal?: AbortSignal,
): Promise<void> {
  const rgPath = await getRgPath()
  if (!rgPath) throw new Error('ripgrep (rg) not found in PATH')

  if (signal?.aborted) return

  const proc = Bun.spawn([rgPath, ...args, target], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const reader = proc.stdout.getReader()
  const decoder = new TextDecoder()
  let remainder = ''

  while (true) {
    if (signal?.aborted) { proc.kill(); break }

    const { done, value } = await reader.read()
    if (done) {
      if (remainder) onLines([remainder])
      break
    }

    const chunk = decoder.decode(value, { stream: true })
    const data = remainder + chunk
    const lines = data.split('\n')
    remainder = lines.pop() ?? ''
    const clean = lines.map(l => l.endsWith('\r') ? l.slice(0, -1) : l).filter(Boolean)
    if (clean.length) onLines(clean)
  }

  await proc.exited
}

/**
 * Count files that would be matched by ripgrep.
 * Used to estimate search scope.
 */
export async function countMatchingFiles(
  target: string,
  globPattern?: string,
  signal?: AbortSignal,
): Promise<number> {
  const args = ['--files']
  if (globPattern) args.push('--glob', globPattern)

  try {
    const lines = await ripGrep(args, target, signal)
    return lines.length
  } catch {
    return 0
  }
}

/**
 * Check if ripgrep is available on this system.
 */
export async function isRipgrepAvailable(): Promise<boolean> {
  return (await getRgPath()) != null
}
