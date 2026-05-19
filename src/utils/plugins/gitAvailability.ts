/**
 * Git availability detection — adapted from CC's utils/plugins/gitAvailability.ts
 *
 * Cached check for git availability on the system PATH.
 * Required for GitHub-based plugin marketplace installation.
 */

import { which } from '../which.js'

async function isCommandAvailable(command: string): Promise<boolean> {
  try {
    return !!(await which(command))
  } catch {
    return false
  }
}

let _gitAvailable: Promise<boolean> | undefined

/**
 * Check if git is available on the system (cached per process).
 * Only checks PATH — does not exec git.
 *
 * On macOS, the /usr/bin/git xcrun shim may pass this check even without
 * Xcode CLT. Call markGitUnavailable() if a subsequent git invocation fails.
 */
export function checkGitAvailable(): Promise<boolean> {
  if (!_gitAvailable) {
    _gitAvailable = isCommandAvailable('git')
  }
  return _gitAvailable
}

/**
 * Force git-availability to false for the rest of the session.
 * Call when a git invocation fails (e.g., macOS xcrun shim error).
 */
export function markGitUnavailable(): void {
  _gitAvailable = Promise.resolve(false)
}

/**
 * Clear git availability cache. For testing only.
 */
export function clearGitAvailabilityCache(): void {
  _gitAvailable = undefined
}
