/**
 * useMinDisplayTime React hook — direct port of CC's hooks/useMinDisplayTime.ts
 *
 * Throttles a value so each distinct value is visible for at least minMs.
 * Prevents fast-cycling progress text from flickering past too quickly.
 *
 * Unlike debounce (wait for quiet) or throttle (limit rate), this guarantees
 * each value gets its minimum screen time before being replaced.
 *
 * @param value  Current value
 * @param minMs  Minimum display time in milliseconds
 * @returns Throttled value (lags behind actual value by at most minMs)
 */

import { useEffect, useRef, useState } from 'react'

export function useMinDisplayTime<T>(value: T, minMs: number): T {
  const [displayed, setDisplayed] = useState(value)
  const lastShownAtRef = useRef(0)

  useEffect(() => {
    const elapsed = Date.now() - lastShownAtRef.current
    if (elapsed >= minMs) {
      lastShownAtRef.current = Date.now()
      setDisplayed(value)
      return
    }
    const timer = setTimeout(
      (shownAtRef: typeof lastShownAtRef, setFn: typeof setDisplayed, v: T) => {
        shownAtRef.current = Date.now()
        setFn(v)
      },
      minMs - elapsed,
      lastShownAtRef,
      setDisplayed,
      value,
    )
    return () => clearTimeout(timer)
  })

  return displayed
}
