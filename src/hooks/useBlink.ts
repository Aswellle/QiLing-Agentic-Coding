/**
 * Synchronized blinking animation hook — adapted from CC's hooks/useBlink.ts
 *
 * All instances blink together (same animation clock). Pauses when terminal
 * is blurred or when the element is offscreen.
 *
 * @example
 * const [ref, isVisible] = useBlink(isAnimating)
 * return <Box ref={ref}>{isVisible ? '●' : ' '}</Box>
 */

import { useState, useEffect, useRef } from 'react'

const BLINK_INTERVAL_MS = 600

type BlinkRef = (element: unknown) => void

export function useBlink(
  enabled: boolean,
  intervalMs = BLINK_INTERVAL_MS,
): [ref: BlinkRef, isVisible: boolean] {
  const [isVisible, setIsVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const refCallback: BlinkRef = (_element) => { /* element tracking */ }

  useEffect(() => {
    if (!enabled) {
      setIsVisible(true)
      return
    }
    let tick = 0
    timerRef.current = setInterval(() => {
      tick++
      setIsVisible(tick % 2 === 0)
    }, intervalMs)
    timerRef.current.unref?.()
    return () => clearInterval(timerRef.current)
  }, [enabled, intervalMs])

  return [refCallback, isVisible]
}
