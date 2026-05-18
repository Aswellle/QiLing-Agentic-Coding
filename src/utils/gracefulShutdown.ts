/**
 * Graceful shutdown — adapted from CC's utils/gracefulShutdown.ts
 *
 * Registers SIGINT/SIGTERM handlers to run cleanup functions before exit.
 * Integrates with cleanupRegistry.ts for automatic resource cleanup.
 *
 * CC version: extensive tracking of shutdown state, LSP teardown, etc.
 * QiLing version: focused on the essentials — cleanup registry + signal handling.
 */

import { runCleanupFunctions } from './cleanupRegistry'

// ─── State ────────────────────────────────────────────────────────────────────

let _shutdownRegistered = false
let _shuttingDown = false
let _exitCode = 0

/** True once graceful shutdown has begun */
export function isShuttingDown(): boolean {
  return _shuttingDown
}

/** Get the exit code to use when process.exit() is called */
export function getExitCode(): number {
  return _exitCode
}

// ─── Shutdown sequence ────────────────────────────────────────────────────────

async function runShutdown(code: number, reason: string): Promise<void> {
  if (_shuttingDown) return
  _shuttingDown = true
  _exitCode = code

  if (process.env.QILING_DEBUG === '1') {
    console.error(`[gracefulShutdown] Shutting down (${reason}, code=${code})`)
  }

  try {
    await runCleanupFunctions()
  } catch (err) {
    if (process.env.QILING_DEBUG === '1') {
      console.error('[gracefulShutdown] Cleanup error:', err)
    }
  }

  process.exit(code)
}

// ─── Signal handler registration ──────────────────────────────────────────────

/**
 * Register SIGINT and SIGTERM handlers for graceful shutdown.
 * Safe to call multiple times — only registers once per process.
 */
export function registerGracefulShutdown(): void {
  if (_shutdownRegistered) return
  _shutdownRegistered = true

  process.once('SIGINT', () => {
    void runShutdown(130, 'SIGINT')  // 128 + 2
  })

  process.once('SIGTERM', () => {
    void runShutdown(143, 'SIGTERM')  // 128 + 15
  })

  process.once('SIGHUP', () => {
    void runShutdown(129, 'SIGHUP')  // 128 + 1
  })

  // Uncaught exceptions — log and exit with error code
  process.once('uncaughtException', (err: Error) => {
    console.error('[qiling] Uncaught exception:', err.message)
    if (process.env.QILING_DEBUG === '1') console.error(err.stack)
    void runShutdown(1, 'uncaughtException')
  })

  // Unhandled promise rejections
  process.once('unhandledRejection', (reason: unknown) => {
    const msg = reason instanceof Error ? reason.message : String(reason)
    if (process.env.QILING_DEBUG === '1') {
      console.error('[qiling] Unhandled rejection:', msg)
    }
    // Don't exit — just log. Unhandled rejections in background tasks are common.
  })
}

/**
 * Force immediate shutdown with the given exit code.
 * Runs cleanup functions before exiting.
 */
export async function forceShutdown(code = 1): Promise<never> {
  await runShutdown(code, 'force')
  process.exit(code)
}

/**
 * Reset shutdown state (for testing only).
 */
export function _resetShutdownForTesting(): void {
  _shuttingDown = false
  _shutdownRegistered = false
  _exitCode = 0
}
