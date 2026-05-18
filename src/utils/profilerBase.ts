/**
 * Shared profiler infrastructure — direct port of CC's utils/profilerBase.ts
 *
 * Shared by startupProfiler, queryProfiler, headlessProfiler.
 * Uses perf_hooks timeline for high-resolution timing.
 *
 * getPerformance(): lazy-load performance API (only when profiling is active)
 * formatMs(): format milliseconds with 3 decimal places
 * formatTimelineLine(): render a single profiler timeline entry
 */

import type { performance as PerformanceType } from 'node:perf_hooks'
import { formatFileSize } from './format.js'

// Lazy-load: perf_hooks.performance is a process-wide singleton
let performance: typeof PerformanceType | null = null

export function getPerformance(): typeof PerformanceType {
  if (!performance) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    performance = require('node:perf_hooks').performance
  }
  return performance!
}

export function formatMs(ms: number): string {
  return ms.toFixed(3)
}

/**
 * Render a single timeline line:
 *   [+  total.ms] (+  delta.ms) name [extra] [| RSS: .., Heap: ..]
 *
 * @param totalMs   Milliseconds since profiler start
 * @param deltaMs   Milliseconds since previous checkpoint
 * @param name      Checkpoint label
 * @param memory    Optional memory snapshot (NodeJS.MemoryUsage)
 * @param totalPad  Width for totalMs column (startup=8, query=10)
 * @param deltaPad  Width for deltaMs column (startup=7, query=9)
 * @param extra     Optional extra label appended after name
 */
export function formatTimelineLine(
  totalMs: number,
  deltaMs: number,
  name: string,
  memory: NodeJS.MemoryUsage | undefined,
  totalPad: number,
  deltaPad: number,
  extra = '',
): string {
  const memInfo = memory
    ? ` | RSS: ${formatFileSize(memory.rss)}, Heap: ${formatFileSize(memory.heapUsed)}`
    : ''
  return `[+${formatMs(totalMs).padStart(totalPad)}ms] (+${formatMs(deltaMs).padStart(deltaPad)}ms) ${name}${extra}${memInfo}`
}
