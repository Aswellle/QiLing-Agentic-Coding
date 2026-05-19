/**
 * Compact warning suppression state — adapted from CC's services/compact/compactWarningState.ts
 *
 * Tracks whether the "context left until autocompact" warning should be suppressed.
 * Suppressed immediately after successful compaction (token counts may be stale).
 * Stays React-free so microCompact.ts can import without pulling React into startup.
 */

import { createStore } from '../../state/store.js'

export const compactWarningStore = createStore<boolean>(false)

export function suppressCompactWarning(): void {
  compactWarningStore.setState(() => true)
}

export function clearCompactWarningSuppression(): void {
  compactWarningStore.setState(() => false)
}
