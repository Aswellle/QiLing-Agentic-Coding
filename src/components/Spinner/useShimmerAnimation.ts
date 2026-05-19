/**
 * Shimmer animation hook — adapted from CC's components/Spinner/useShimmerAnimation.ts
 *
 * Returns a ref + glimmerIndex for scroll-shimmer animations.
 * Passes null to useAnimationFrame when stalled to unsubscribe from the clock.
 */

import { useMemo } from 'react'
import { stringWidth } from '../../ink/stringWidth.js'
import { useAnimationFrame } from '../../ink/hooks/use-animation-frame.js'
import type { SpinnerMode } from './types.js'

export function useShimmerAnimation(
  mode: SpinnerMode,
  message: string,
  isStalled: boolean,
): [ref: (element: unknown) => void, glimmerIndex: number] {
  const glimmerSpeed = mode === 'requesting' ? 50 : 200
  const [ref, time] = useAnimationFrame(isStalled ? null : glimmerSpeed)
  const messageWidth = useMemo(() => stringWidth(message), [message])

  if (isStalled) return [ref, -100]

  const cyclePosition = Math.floor(time / glimmerSpeed)
  const cycleLength = messageWidth + 20

  if (mode === 'requesting') {
    return [ref, (cyclePosition % cycleLength) - 10]
  }
  return [ref, messageWidth + 10 - (cyclePosition % cycleLength)]
}
