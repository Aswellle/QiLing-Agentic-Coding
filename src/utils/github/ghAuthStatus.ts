/**
 * GitHub CLI auth status — adapted from CC's utils/github/ghAuthStatus.ts
 *
 * Detects whether the gh CLI is installed and authenticated.
 * Uses `gh auth token` (reads local config only, no network request).
 */

import { which } from '../which.js'
import { execFileNoThrow } from '../execFileNoThrow.js'

export type GhAuthStatus =
  | 'authenticated'
  | 'not_authenticated'
  | 'not_installed'

/**
 * Returns gh CLI install + auth status.
 * which() = Bun.which (no subprocess), then exit code of `gh auth token`.
 */
export async function getGhAuthStatus(): Promise<GhAuthStatus> {
  const ghPath = await which('gh')
  if (!ghPath) return 'not_installed'

  const { code } = await execFileNoThrow('gh', ['auth', 'token'], {
    timeout: 5_000,
    stdin: 'ignore',
  })
  return code === 0 ? 'authenticated' : 'not_authenticated'
}
