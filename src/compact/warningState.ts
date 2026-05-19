/**
 * Compact warning suppression state — adapted from CC's services/compact/compactWarningState.ts
 *
 * Uses createStore so both React (useSyncExternalStore) and non-React callers
 * can subscribe to the state. Keep this file React-free — see compactWarningHook.ts.
 */

import { createStore } from '../state/store.js'

export const compactWarningStore = createStore<boolean>(false)

/** Suppress the compact warning. Call after successful compaction. */
export function suppressCompactWarning(): void {
  compactWarningStore.setState(() => true)
}

/** Clear the compact warning suppression. Called at start of new compact attempt. */
export function clearCompactWarningSuppression(): void {
  compactWarningStore.setState(() => false)
}

/** True if the compact warning should be suppressed. */
export function isCompactWarningSuppressed(): boolean {
  return compactWarningStore.getState()
}
