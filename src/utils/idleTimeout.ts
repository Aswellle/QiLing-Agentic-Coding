/**
 * Idle timeout manager — ported from CC's utils/idleTimeout.ts (adapted)
 *
 * Creates an auto-exit timer for scripted/SDK use.
 * Set QILING_EXIT_AFTER_IDLE_MS to auto-exit after N ms of idle.
 */

export function createIdleTimeoutManager(isIdle: () => boolean): {
  start: () => void
  stop: () => void
} {
  const envVal = process.env.QILING_EXIT_AFTER_IDLE_MS
  const delayMs = envVal ? parseInt(envVal, 10) : null
  const isValidDelay = delayMs && !isNaN(delayMs) && delayMs > 0

  let timer: ReturnType<typeof setTimeout> | null = null
  let lastIdleTime = 0

  return {
    start() {
      if (timer) { clearTimeout(timer); timer = null }
      if (isValidDelay) {
        lastIdleTime = Date.now()
        timer = setTimeout(() => {
          const idleDuration = Date.now() - lastIdleTime
          if (isIdle() && idleDuration >= delayMs) {
            process.stderr.write(`[idleTimeout] Exiting after ${delayMs}ms of idle time\n`)
            process.exit(0)
          }
        }, delayMs)
        // @ts-ignore
        timer.unref?.()
      }
    },
    stop() {
      if (timer) { clearTimeout(timer); timer = null }
    },
  }
}
