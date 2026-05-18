/**
 * Git-related settings helpers — adapted from CC's utils/gitSettings.ts
 *
 * Kept separate from git.ts to avoid circular dependency with settings.ts.
 */

import { loadSettings } from '../settings/loader'

/**
 * Whether to include git instructions in system prompts.
 * Controlled by QILING_DISABLE_GIT_INSTRUCTIONS env var or settings.
 */
export function shouldIncludeGitInstructions(workingDir = process.cwd()): boolean {
  if (process.env.QILING_DISABLE_GIT_INSTRUCTIONS === '1') return false
  if (process.env.QILING_DISABLE_GIT_INSTRUCTIONS === '0') return true
  // Read from settings (default: true)
  try {
    const settings = loadSettings(workingDir)
    return (settings as { includeGitInstructions?: boolean }).includeGitInstructions !== false
  } catch {
    return true
  }
}
