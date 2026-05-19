/**
 * React hook for compact warning suppression — adapted from CC's services/compact/compactWarningHook.ts
 *
 * Separate file so compactWarningState.ts stays React-free (non-React callers
 * like query.ts and microCompact.ts don't drag React into the print-mode path).
 */

import { useSyncExternalStore } from 'react'
import { compactWarningStore } from './warningState.js'

export function useCompactWarningSuppression(): boolean {
  return useSyncExternalStore(
    compactWarningStore.subscribe,
    compactWarningStore.getState,
  )
}
