/**
 * Clock-backed interval hook — adapted from CC's ink/hooks/use-interval.ts
 *
 * Backed by the shared ClockContext instead of independent setIntervals,
 * so all timers consolidate into one wake-up source.
 * Non-keepAlive: won't keep the clock alive alone; piggybacks on spinner etc.
 */

import { useContext, useEffect, useRef, useState } from 'react'
import { ClockContext } from '../components/ClockContext.js'

/**
 * Returns the clock time, updating at the given interval.
 * Non-keepAlive: drives computations only when another keepAlive subscriber
 * (e.g. the spinner) is running the clock.
 */
export function useAnimationTimer(intervalMs: number): number {
  const clock = useContext(ClockContext)
  const [time, setTime] = useState(() => clock?.now() ?? 0)

  useEffect(() => {
    if (!clock) return
    let lastUpdate = clock.now()
    const onChange = (): void => {
      const now = clock.now()
      if (now - lastUpdate >= intervalMs) {
        lastUpdate = now
        setTime(now)
      }
    }
    return clock.subscribe(onChange, false)
  }, [clock, intervalMs])

  return time
}

/**
 * Interval hook backed by the shared Clock.
 * Pass null for intervalMs to pause.
 *
 * Unlike usehooks-ts useInterval (independent setInterval), this consolidates
 * all timers into the shared clock's single wake-up.
 */
export function useInterval(
  callback: () => void,
  intervalMs: number | null,
): void {
  const callbackRef = useRef(callback)
  callbackRef.current = callback
  const clock = useContext(ClockContext)

  useEffect(() => {
    if (!clock || intervalMs === null) return
    let lastUpdate = clock.now()
    const onChange = (): void => {
      const now = clock.now()
      if (now - lastUpdate >= intervalMs) {
        lastUpdate = now
        callbackRef.current()
      }
    }
    return clock.subscribe(onChange, false)
  }, [clock, intervalMs])
}
