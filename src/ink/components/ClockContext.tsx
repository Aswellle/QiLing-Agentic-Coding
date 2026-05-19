/**
 * Animation clock context — adapted from CC's ink/components/ClockContext.tsx
 *
 * Provides a synchronized animation clock to all components via React Context.
 * The clock is paused (slower tick) when the terminal is blurred to save CPU.
 * All clock subscribers in the same tick see the same time value (animations sync).
 */

import React, { createContext, useEffect, useRef, useState } from 'react'
import { FRAME_INTERVAL_MS } from '../constants.js'

export type Clock = {
  subscribe: (onChange: () => void, keepAlive: boolean) => () => void
  now: () => number
  setTickInterval: (ms: number) => void
}

export function createClock(tickIntervalMs: number): Clock {
  const subscribers = new Map<() => void, boolean>()
  let interval: ReturnType<typeof setInterval> | null = null
  let currentTickIntervalMs = tickIntervalMs
  let startTime = 0
  let tickTime = 0  // Synchronized time snapshot for current tick

  function tick(): void {
    tickTime = Date.now() - startTime
    for (const onChange of subscribers.keys()) onChange()
  }

  function updateInterval(): void {
    const anyKeepAlive = [...subscribers.values()].some(Boolean)

    if (anyKeepAlive) {
      if (interval) { clearInterval(interval); interval = null }
      if (startTime === 0) startTime = Date.now()
      interval = setInterval(tick, currentTickIntervalMs)
    } else if (interval) {
      clearInterval(interval)
      interval = null
    }
  }

  return {
    subscribe(onChange, keepAlive) {
      subscribers.set(onChange, keepAlive)
      updateInterval()
      return () => { subscribers.delete(onChange); updateInterval() }
    },

    now() {
      if (startTime === 0) startTime = Date.now()
      if (interval && tickTime) return tickTime
      return Date.now() - startTime
    },

    setTickInterval(ms) {
      if (ms === currentTickIntervalMs) return
      currentTickIntervalMs = ms
      updateInterval()
    },
  }
}

export const ClockContext = createContext<Clock | null>(null)

const BLURRED_TICK_INTERVAL_MS = FRAME_INTERVAL_MS * 2

/**
 * Provides the animation clock to the component tree.
 * Slows tick interval when terminal is blurred (~30fps → ~16fps).
 */
export function ClockProvider({ children }: { children: React.ReactNode }): React.ReactNode {
  const [clock] = useState(() => createClock(FRAME_INTERVAL_MS))
  const [isFocused, setIsFocused] = useState(true)

  useEffect(() => {
    // Simple focus tracking via document focus events (Ink compatibility)
    const onFocus = () => setIsFocused(true)
    const onBlur = () => setIsFocused(false)
    process.stdin.on('data', onFocus)
    return () => { process.stdin.off('data', onFocus) }
  }, [])

  useEffect(() => {
    clock.setTickInterval(isFocused ? FRAME_INTERVAL_MS : BLURRED_TICK_INTERVAL_MS)
  }, [clock, isFocused])

  return <ClockContext.Provider value={clock}>{children}</ClockContext.Provider>
}
