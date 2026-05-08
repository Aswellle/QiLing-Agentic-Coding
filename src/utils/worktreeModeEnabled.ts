/**
 * Worktree mode check — ported from CC's utils/worktreeModeEnabled.ts (verbatim)
 * Worktree mode is unconditionally enabled (was previously behind a feature flag).
 */
export function isWorktreeModeEnabled(): boolean {
  return true
}
