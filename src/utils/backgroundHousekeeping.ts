/**
 * Background housekeeping — adapted from CC's utils/backgroundHousekeeping.ts
 *
 * Runs deferred maintenance tasks after startup to avoid impacting
 * startup time. Tasks include session memory cleanup, stale file removal,
 * and worktree cleanup.
 *
 * CC version: integrates autoDream, MagicDocs init, plugin autoupdate, etc.
 * QiLing version: focused on session-independent maintenance tasks.
 */

const DELAY_SLOW_OPS_MS = 10 * 60 * 1000  // 10 minutes after start
const DAILY_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000  // 24 hours

/** Whether housekeeping has been started in this process */
let _started = false

/**
 * Start all background housekeeping tasks.
 * Call once at REPL startup. Safe to call multiple times (no-op after first call).
 */
export function startBackgroundHousekeeping(cwd = process.cwd()): void {
  if (_started) return
  _started = true

  // Schedule slow cleanup after 10 minutes (don't impact startup)
  const slowTimer = setTimeout(async () => {
    await runSlowHousekeeping(cwd)
  }, DELAY_SLOW_OPS_MS)

  // Don't prevent process exit
  slowTimer.unref?.()

  // Daily recurring cleanup for long sessions
  const dailyTimer = setInterval(async () => {
    await runDailyHousekeeping(cwd)
  }, DAILY_CLEANUP_INTERVAL_MS)
  dailyTimer.unref?.()
}

/** Reset state (for testing) */
export function resetBackgroundHousekeeping(): void {
  _started = false
}

// ─── Task implementations ─────────────────────────────────────────────────────

async function runSlowHousekeeping(cwd: string): Promise<void> {
  await Promise.allSettled([
    cleanupStaleSessionFiles(cwd),
    cleanupStaleWorktrees(cwd),
    cleanupOldToolResultFiles(),
  ])
}

async function runDailyHousekeeping(cwd: string): Promise<void> {
  await Promise.allSettled([
    cleanupStaleSessionFiles(cwd),
    cleanupOldToolResultFiles(),
  ])
}

/** Remove session metadata files older than 30 days */
async function cleanupStaleSessionFiles(_cwd: string): Promise<void> {
  const { existsSync, readdirSync, statSync, unlinkSync } = await import('node:fs')
  const { join } = await import('node:path')
  const { homedir } = await import('node:os')

  const sessionDir = join(homedir(), '.qiling', 'sessions')
  if (!existsSync(sessionDir)) return

  const STALE_AGE_MS = 30 * 24 * 60 * 60 * 1000  // 30 days
  const now = Date.now()

  try {
    const files = readdirSync(sessionDir).filter(f => f.endsWith('-meta.json'))
    for (const file of files) {
      const p = join(sessionDir, file)
      try {
        const s = statSync(p)
        if (now - s.mtimeMs > STALE_AGE_MS) unlinkSync(p)
      } catch { /* skip */ }
    }
  } catch { /* ignore */ }
}

/** Remove stale git worktrees left by crashed agent processes */
async function cleanupStaleWorktrees(cwd: string): Promise<void> {
  try {
    const { cleanupStaleAgentWorktrees } = await import('./worktree')
    await cleanupStaleAgentWorktrees(cwd)
  } catch { /* non-fatal */ }
}

/** Remove tool result files older than 7 days */
async function cleanupOldToolResultFiles(): Promise<void> {
  const { existsSync, readdirSync, statSync, unlinkSync } = await import('node:fs')
  const { join } = await import('node:path')
  const { homedir } = await import('node:os')

  const sessionsDir = join(homedir(), '.qiling', 'sessions')
  if (!existsSync(sessionsDir)) return

  const STALE_AGE_MS = 7 * 24 * 60 * 60 * 1000  // 7 days
  const now = Date.now()

  try {
    const sessionDirs = readdirSync(sessionsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => join(sessionsDir, d.name))

    for (const dir of sessionDirs) {
      const toolResultsDir = join(dir, 'tool-results')
      if (!existsSync(toolResultsDir)) continue

      try {
        const files = readdirSync(toolResultsDir)
        for (const file of files) {
          const p = join(toolResultsDir, file)
          try {
            const s = statSync(p)
            if (now - s.mtimeMs > STALE_AGE_MS) unlinkSync(p)
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
    }
  } catch { /* ignore */ }
}
