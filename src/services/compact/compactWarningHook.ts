/**
 * Compact warning suppression hook — adapted from CC's services/compact/compactWarningHook.ts
 *
 * Separated from compactWarningState.ts to keep that module React-free.
 * Use useSyncExternalStore so React re-renders on state changes.
 */

import { useSyncExternalStore } from 'react'
import { compactWarningStore } from './compactWarningState.js'

export function useCompactWarningSuppression(): boolean {
  return useSyncExternalStore(
    compactWarningStore.subscribe,
    compactWarningStore.getState,
  )
}
