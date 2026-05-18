/**
 * Worktree path detection — adapted from CC's utils/getWorktreePaths.ts
 *
 * Returns the paths of all git worktrees for the current repository.
 * Delegates to getWorktreePathsPortable() (no analytics, no execa).
 *
 * CC has two versions:
 * - getWorktreePathsPortable.ts — minimal deps, safe for Agent SDK import
 * - getWorktreePaths.ts (this file) — adds analytics tracking (CC-specific)
 *
 * QiLing uses the portable version but re-exports it here for CC API parity.
 */

export { getWorktreePathsPortable as getWorktreePaths } from './getWorktreePathsPortable.js'
