/**
 * useTimeout React hook — direct port of CC's hooks/useTimeout.ts
 *
 * Returns true after the given delay. Resets when resetTrigger changes.
 * Useful for delayed UI elements (e.g., showing hints after N ms).
 *
 * @param delay         Milliseconds to wait
 * @param resetTrigger  Optional counter — increment to reset the timer
 */

import { useEffect, useState } from 'react'

export function useTimeout(delay: number, resetTrigger?: number): boolean {
  const [isElapsed, setIsElapsed] = useState(false)

  useEffect(() => {
    setIsElapsed(false)
    const timer = setTimeout(setIsElapsed, delay, true)
    return () => clearTimeout(timer)
  }, [delay, resetTrigger])

  return isElapsed
}
