/**
 * Compact warning suppression state — ported from CC's services/compact/compactWarningState.ts
 *
 * Tracks whether the "context nearly full → auto-compact" warning should be suppressed.
 * We suppress immediately after successful compaction since token counts are stale
 * until the next API response comes back.
 */

let _suppressed = false

/** Suppress the compact warning. Call after successful compaction. */
export function suppressCompactWarning(): void {
  _suppressed = true
}

/** Clear the compact warning suppression. Called at start of new compact attempt. */
export function clearCompactWarningSuppression(): void {
  _suppressed = false
}

/** True if the compact warning should be suppressed. */
export function isCompactWarningSuppressed(): boolean {
  return _suppressed
}
