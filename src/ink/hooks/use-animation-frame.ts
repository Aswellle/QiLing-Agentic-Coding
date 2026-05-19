/**
 * Animation frame hook — adapted from CC's ink/hooks/use-animation-frame.ts
 *
 * Returns a ref + elapsed time for synchronized animations that pause when
 * the element is offscreen. All instances share the same ClockContext clock.
 *
 * Pass null as intervalMs to pause (unsubscribes from clock, time freezes).
 */

import { useContext, useEffect, useState } from 'react'
import { ClockContext } from '../components/ClockContext.js'
import { useTerminalViewport } from './use-terminal-viewport.js'

export function useAnimationFrame(
  intervalMs: number | null = 16,
): [ref: (element: unknown) => void, time: number] {
  const clock = useContext(ClockContext)
  const [viewportRef, { isVisible }] = useTerminalViewport()
  const [time, setTime] = useState(() => clock?.now() ?? 0)

  const active = isVisible && intervalMs !== null

  useEffect(() => {
    if (!clock || !active) return

    let lastUpdate = clock.now()

    const onChange = (): void => {
      const now = clock.now()
      if (now - lastUpdate >= intervalMs!) {
        lastUpdate = now
        setTime(now)
      }
    }

    return clock.subscribe(onChange, true)
  }, [clock, intervalMs, active])

  return [viewportRef, time]
}
