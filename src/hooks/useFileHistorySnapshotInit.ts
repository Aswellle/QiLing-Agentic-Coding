/**
 * File history snapshot init hook — adapted from CC's hooks/useFileHistorySnapshotInit.ts
 *
 * Restores file history state from saved snapshots on mount.
 * In QiLing: simplified stub (full CC file history differs in implementation).
 */

import { useEffect, useRef } from 'react'

export type FileHistorySnapshot = {
  filePath: string
  content: string
  timestamp: number
}

export type FileHistoryState = {
  snapshots: FileHistorySnapshot[]
}

export function useFileHistorySnapshotInit(
  _initialSnapshots: FileHistorySnapshot[] | undefined,
  _state: FileHistoryState,
  _onUpdateState: (newState: FileHistoryState) => void,
): void {
  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    // Restoration logic wired when CC fileHistory is fully ported
  }, [])
}
