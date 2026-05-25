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

// FROM CC: rewritten to use useAnimationFrame + useTerminalFocus for synced, offscreen-aware blinking
import { useAnimationFrame } from '../ink/hooks/use-animation-frame.js'
import { useTerminalFocus } from '../ink/hooks/use-terminal-focus.js'

const BLINK_INTERVAL_MS = 600

export function useBlink(
  enabled: boolean,
  intervalMs: number = BLINK_INTERVAL_MS,
) {
  const focused = useTerminalFocus()
  const [ref, time] = useAnimationFrame(enabled && focused ? intervalMs : null)

  if (!enabled || !focused) return [ref, true] as const

  // Derive blink state from time - all instances see the same time so they sync
  const isVisible = Math.floor(time / intervalMs) % 2 === 0
  return [ref, isVisible] as const
}
