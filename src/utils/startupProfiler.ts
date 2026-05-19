/**
 * Startup profiling — adapted from CC's utils/startupProfiler.ts
 *
 * Measures time spent in initialization phases.
 * Enable with: QILING_PROFILE_STARTUP=1 (or CLAUDE_CODE_PROFILE_STARTUP=1)
 * Report written to ~/.qiling/cache/startup-perf-<sessionId>.log
 *
 * Uses perf_hooks.performance.mark() + getPerformance() from profilerBase.ts.
 */

import { writeFileSync } from 'node:fs'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { formatMs, formatTimelineLine, getPerformance } from './profilerBase.js'

const DETAILED_PROFILING =
  process.env.QILING_PROFILE_STARTUP === '1' ||
  process.env.CLAUDE_CODE_PROFILE_STARTUP === '1'

const memorySnapshots: NodeJS.MemoryUsage[] = []
let startMs: number | undefined

/**
 * Record a startup checkpoint with high-resolution timing.
 * Does nothing when profiling is disabled.
 */
export function profileCheckpoint(name: string): void {
  if (!DETAILED_PROFILING) return
  const perf = getPerformance()
  if (startMs === undefined) startMs = perf.now()
  perf.mark(name)
  memorySnapshots.push(process.memoryUsage())
}

/**
 * Print the full startup timeline to stderr and write to the perf log file.
 */
export function profileReport(): void {
  if (!DETAILED_PROFILING) return
  const perf = getPerformance()
  const marks = perf.getEntriesByType('mark')
  if (marks.length === 0) return

  const lines: string[] = ['--- QiLing startup profile ---']
  let prevMs = startMs ?? 0

  for (let i = 0; i < marks.length; i++) {
    const mark = marks[i]!
    const totalMs = mark.startTime
    const deltaMs = totalMs - prevMs
    const memory = memorySnapshots[i]
    lines.push(formatTimelineLine(totalMs, deltaMs, mark.name, memory, 8, 7))
    prevMs = totalMs
  }

  const report = lines.join('\n')
  process.stderr.write(report + '\n')

  try {
    const logPath = getStartupPerfLogPath()
    mkdirSync(join(logPath, '..'), { recursive: true })
    writeFileSync(logPath, report + '\n')
  } catch { /* ignore write failures */ }
}

export function isDetailedProfilingEnabled(): boolean {
  return DETAILED_PROFILING
}

export function getStartupPerfLogPath(): string {
  const sessionId = process.pid.toString()
  return join(homedir(), '.qiling', 'cache', `startup-perf-${sessionId}.log`)
}
