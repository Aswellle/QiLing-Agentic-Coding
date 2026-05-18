/**
 * useDoublePress React hook — direct port of CC's hooks/useDoublePress.ts
 *
 * Calls one function on first press, another on double press within a timeout.
 * Used for Ctrl+C double-press to exit (first press: interrupt, second: quit).
 *
 * @param setPending   Set the "first press pending" state (show visual hint)
 * @param onDoublePress Called when a second press occurs within DOUBLE_PRESS_TIMEOUT_MS
 * @param onFirstPress  Called on first press (optional)
 * @returns Stable press handler function
 */

import { useCallback, useEffect, useRef } from 'react'

export const DOUBLE_PRESS_TIMEOUT_MS = 800

export function useDoublePress(
  setPending: (pending: boolean) => void,
  onDoublePress: () => void,
  onFirstPress?: () => void,
): () => void {
  const lastPressRef = useRef<number>(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const clearTimeoutSafe = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = undefined
    }
  }, [])

  useEffect(() => () => clearTimeoutSafe(), [clearTimeoutSafe])

  return useCallback(() => {
    const now = Date.now()
    const timeSinceLastPress = now - lastPressRef.current
    const isDoublePress =
      timeSinceLastPress <= DOUBLE_PRESS_TIMEOUT_MS &&
      timeoutRef.current !== undefined

    if (isDoublePress) {
      clearTimeoutSafe()
      setPending(false)
      onDoublePress()
    } else {
      onFirstPress?.()
      setPending(true)
      clearTimeoutSafe()
      timeoutRef.current = setTimeout(
        (sp: (v: boolean) => void, tr: typeof timeoutRef) => {
          sp(false)
          tr.current = undefined
        },
        DOUBLE_PRESS_TIMEOUT_MS,
        setPending,
        timeoutRef,
      )
    }

    lastPressRef.current = now
  }, [setPending, onDoublePress, onFirstPress, clearTimeoutSafe])
}
