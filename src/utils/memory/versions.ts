/**
 * Git repo detection helpers — adapted from CC's utils/memory/versions.ts
 *
 * Synchronous filesystem-only check (no subprocess).
 * For async version, prefer the isGitRepo() in utils/gitDiff.ts.
 */

import { findGitRoot } from '../gitDiff.js'

/**
 * Check if the given directory is inside a git repository.
 * Uses filesystem-only detection (no subprocess).
 */
export function projectIsInGitRepo(cwd: string): boolean {
  return findGitRoot(cwd) !== null
}
