/**
 * Find executable utility — direct port of CC's utils/findExecutable.ts
 *
 * Replaces spawn-rx's findActualExecutable to avoid pulling in rxjs.
 * Returns { cmd, args } matching the spawn-rx API shape.
 */

import { whichSync } from './which'

export function findExecutable(
  exe: string,
  args: string[],
): { cmd: string; args: string[] } {
  const resolved = whichSync(exe)
  return { cmd: resolved ?? exe, args }
}
