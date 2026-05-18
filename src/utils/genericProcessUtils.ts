/**
 * Platform-agnostic process utilities — direct port of CC's utils/genericProcessUtils.ts
 */

/**
 * Check if a process with the given PID is running (signal 0 probe).
 * Returns false for PID ≤ 1 (process group / init).
 * Conservative: processes owned by another user report as NOT running.
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
 * Get the current process's parent PID.
 */
export function getParentPid(): number | null {
  try {
    return process.ppid ?? null
  } catch {
    return null
  }
}

/**
 * Get a flat list of all PIDs currently running (Linux/macOS only).
 * Returns empty array on Windows or on error.
 */
export async function getAllRunningPids(): Promise<number[]> {
  if (process.platform === 'win32') return []
  try {
    const proc = Bun.spawn(['ps', '-e', '-o', 'pid='], { stdout: 'pipe', stderr: 'pipe' })
    await proc.exited
    const stdout = await new Response(proc.stdout).text()
    return stdout
      .trim()
      .split('\n')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0)
  } catch {
    return []
  }
}
