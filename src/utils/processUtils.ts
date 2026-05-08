/**
 * Generic process utilities — ported from CC's utils/genericProcessUtils.ts (core subset)
 *
 * isProcessRunning(): check if a PID is alive via signal 0
 */

/**
 * Check if a process with the given PID is running (signal 0 probe).
 * Returns false for PID ≤ 1 (conservative for lock recovery).
 * Returns false for EPERM (process owned by another user — conservative).
 */
export function isProcessRunning(pid: number): boolean {
  if (pid <= 1) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/**
 * Kill a process by PID. Returns true if signal was sent successfully.
 * Does not guarantee the process actually died.
 */
export function killProcess(pid: number, signal: NodeJS.Signals = 'SIGTERM'): boolean {
  try {
    process.kill(pid, signal)
    return true
  } catch {
    return false
  }
}
