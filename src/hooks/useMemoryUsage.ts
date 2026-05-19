/**
 * Memory usage monitoring hook — adapted from CC's hooks/useMemoryUsage.ts
 *
 * Polls Node.js heap usage every 10 seconds. Returns null when normal (< 1.5GB)
 * to avoid re-rendering on every tick for normal users.
 *
 * Thresholds (same as CC):
 * - high: 1.5 GB heap
 * - critical: 2.5 GB heap
 */

import { useEffect, useRef, useState } from 'react'

export type MemoryUsageStatus = 'normal' | 'high' | 'critical'

export type MemoryUsageInfo = {
  heapUsed: number
  status: MemoryUsageStatus
}

const HIGH_MEMORY_THRESHOLD    = 1.5 * 1024 * 1024 * 1024  // 1.5 GB
const CRITICAL_MEMORY_THRESHOLD = 2.5 * 1024 * 1024 * 1024  // 2.5 GB
const POLL_INTERVAL_MS = 10_000

export function useMemoryUsage(): MemoryUsageInfo | null {
  const [memoryUsage, setMemoryUsage] = useState<MemoryUsageInfo | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  useEffect(() => {
    const check = () => {
      const heapUsed = process.memoryUsage().heapUsed
      const status: MemoryUsageStatus =
        heapUsed >= CRITICAL_MEMORY_THRESHOLD ? 'critical' :
        heapUsed >= HIGH_MEMORY_THRESHOLD ? 'high' : 'normal'

      setMemoryUsage(prev => {
        // Skip re-render when status is normal and was already null
        if (status === 'normal') return prev === null ? prev : null
        return { heapUsed, status }
      })
    }

    timerRef.current = setInterval(check, POLL_INTERVAL_MS)
    timerRef.current.unref?.()
    return () => clearInterval(timerRef.current)
  }, [])

  return memoryUsage
}
