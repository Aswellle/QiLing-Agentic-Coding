/**
 * React hook for classifier approvals — direct port of CC's utils/classifierApprovalsHook.ts
 *
 * Split from classifierApprovals.ts so pure-state importers don't pull React
 * into non-React code paths (print.ts, permissions.ts, toolExecution.ts).
 *
 * Returns true when the given tool call ID is currently being classifier-checked.
 * Used by the UI to show a loading/checking indicator.
 */

import { useSyncExternalStore } from 'react'
import { isClassifierChecking, subscribeClassifierChecking } from './classifierApprovals.js'

export function useIsClassifierChecking(toolUseID: string): boolean {
  return useSyncExternalStore(
    subscribeClassifierChecking,
    () => isClassifierChecking(toolUseID),
  )
}
