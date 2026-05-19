/**
 * Stalled animation hook — adapted from CC's components/Spinner/useStalledAnimation.ts
 *
 * Transitions the spinner to "red/stalled" state when tokens stop flowing.
 * Driven by animation clock time (slows when terminal is blurred).
 *
 * Stall detection: > 3 seconds with no new tokens and no active tool calls.
 * Intensity: fades in over 2 seconds, smoothed over animation frame ticks.
 */

import { useRef } from 'react'

export function useStalledAnimation(
  time: number,
  currentResponseLength: number,
  hasActiveTools = false,
  reducedMotion = false,
): {
  isStalled: boolean
  stalledIntensity: number
} {
  const lastTokenTime = useRef(time)
  const lastResponseLength = useRef(currentResponseLength)
  const mountTime = useRef(time)
  const stalledIntensityRef = useRef(0)
  const lastSmoothTime = useRef(time)

  // Reset when new tokens arrive
  if (currentResponseLength > lastResponseLength.current) {
    lastTokenTime.current = time
    lastResponseLength.current = currentResponseLength
    stalledIntensityRef.current = 0
    lastSmoothTime.current = time
  }

  // Time since last token (from animation clock)
  let timeSinceLastToken: number
  if (hasActiveTools) {
    timeSinceLastToken = 0
    lastTokenTime.current = time
  } else if (currentResponseLength > 0) {
    timeSinceLastToken = time - lastTokenTime.current
  } else {
    timeSinceLastToken = time - mountTime.current
  }

  // Stalled after 3s with no tokens (no active tools)
  const isStalled = timeSinceLastToken > 3000 && !hasActiveTools
  const intensity = isStalled
    ? Math.min((timeSinceLastToken - 3000) / 2000, 1)  // Fade over 2s
    : 0

  // Smooth intensity transition per animation tick
  if (!reducedMotion && (intensity > 0 || stalledIntensityRef.current > 0)) {
    const dt = time - lastSmoothTime.current
    if (dt >= 50) {
      const steps = Math.floor(dt / 50)
      let current = stalledIntensityRef.current
      for (let i = 0; i < steps; i++) {
        const diff = intensity - current
        if (Math.abs(diff) < 0.01) { current = intensity; break }
        current += diff * 0.1
      }
      stalledIntensityRef.current = current
      lastSmoothTime.current = time
    }
  } else {
    stalledIntensityRef.current = intensity
    lastSmoothTime.current = time
  }

  return {
    isStalled,
    stalledIntensity: reducedMotion ? intensity : stalledIntensityRef.current,
  }
}
