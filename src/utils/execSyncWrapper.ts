/**
 * Wrapped execSync with slow-op logging — adapted from CC's utils/execSyncWrapper.ts
 *
 * Prefer async alternatives; sync exec blocks the event loop. Use this when
 * you must call execSync so slow operations are visible in QILING_DEBUG mode.
 */

import {
  type ExecSyncOptions,
  type ExecSyncOptionsWithBufferEncoding,
  type ExecSyncOptionsWithStringEncoding,
  execSync as nodeExecSync,
} from 'node:child_process'

const SLOW_THRESHOLD_MS = 100

function warnSlow(command: string, ms: number): void {
  if (process.env.QILING_DEBUG === '1' && ms > SLOW_THRESHOLD_MS) {
    process.stderr.write(`[slow:execSync ${ms}ms] ${command.slice(0, 100)}\n`)
  }
}

/** @deprecated Use async alternatives when possible. Sync exec blocks the event loop. */
export function execSync_DEPRECATED(command: string): Buffer
export function execSync_DEPRECATED(
  command: string,
  options: ExecSyncOptionsWithStringEncoding,
): string
export function execSync_DEPRECATED(
  command: string,
  options: ExecSyncOptionsWithBufferEncoding,
): Buffer
export function execSync_DEPRECATED(
  command: string,
  options?: ExecSyncOptions,
): Buffer | string
export function execSync_DEPRECATED(
  command: string,
  options?: ExecSyncOptions,
): Buffer | string {
  const t0 = Date.now()
  try {
    return nodeExecSync(command, options as ExecSyncOptions)
  } finally {
    warnSlow(command, Date.now() - t0)
  }
}
