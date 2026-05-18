/**
 * useElapsedTime React hook — direct port of CC's hooks/useElapsedTime.ts
 *
 * Returns formatted elapsed time since startTime. Uses useSyncExternalStore
 * with interval-based updates for efficiency.
 *
 * @param startTime  Unix timestamp in ms
 * @param isRunning  Whether to actively update the timer
 * @param ms         Update interval (default 1000ms)
 * @param pausedMs   Total paused duration to subtract from elapsed time
 * @param endTime    If set, freezes the duration at this timestamp
 *                   (prevents showing "32m" for a task that ran 2m but
 *                    is viewed 30 min later)
 * @returns Formatted duration string (e.g., "1m 23s")
 */

import { useCallback, useSyncExternalStore } from 'react'
import { formatDuration } from '../utils/format.js'

export function useElapsedTime(
  startTime: number,
  isRunning: boolean,
  ms = 1000,
  pausedMs = 0,
  endTime?: number,
): string {
  const get = () =>
    formatDuration(Math.max(0, (endTime ?? Date.now()) - startTime - pausedMs))

  const subscribe = useCallback(
    (notify: () => void) => {
      if (!isRunning) return () => {}
      const interval = setInterval(notify, ms)
      return () => clearInterval(interval)
    },
    [isRunning, ms],
  )

  return useSyncExternalStore(subscribe, get, get)
}
