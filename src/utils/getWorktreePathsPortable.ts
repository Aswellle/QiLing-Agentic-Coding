/**
 * Portable worktree path detection — direct port of CC's utils/getWorktreePathsPortable.ts
 *
 * Uses only child_process (no execa, no analytics, no bootstrap deps).
 * Safe to import from the Agent SDK entrypoint without triggering CLI init.
 */

import { execFile as execFileCb } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFileCb)

export async function getWorktreePathsPortable(cwd: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['worktree', 'list', '--porcelain'],
      { cwd, timeout: 5000 },
    )
    if (!stdout) return []
    return stdout
      .split('\n')
      .filter(line => line.startsWith('worktree '))
      .map(line => line.slice('worktree '.length).normalize('NFC'))
  } catch {
    return []
  }
}
