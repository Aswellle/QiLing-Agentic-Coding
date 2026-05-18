/**
 * Session-scoped environment variables — direct port of CC's utils/sessionEnvVars.ts
 *
 * Stores env vars set via /env command for the current session.
 * Applied to spawned child processes (Bash/PowerShell) but NOT to the REPL process itself.
 * Reset on session end.
 */

const sessionEnvVars = new Map<string, string>()

/** Get all session-scoped env vars (read-only view) */
export function getSessionEnvVars(): ReadonlyMap<string, string> {
  return sessionEnvVars
}

/** Set a session-scoped env var */
export function setSessionEnvVar(name: string, value: string): void {
  sessionEnvVars.set(name, value)
}

/** Delete a session-scoped env var */
export function deleteSessionEnvVar(name: string): void {
  sessionEnvVars.delete(name)
}

/** Clear all session-scoped env vars */
export function clearSessionEnvVars(): void {
  sessionEnvVars.clear()
}

/** Merge session env vars into an existing env object (for child process spawning) */
export function applySessionEnvVars(env: Record<string, string | undefined>): Record<string, string> {
  const merged: Record<string, string> = {}
  for (const [k, v] of Object.entries(env)) {
    if (v !== undefined) merged[k] = v
  }
  for (const [k, v] of sessionEnvVars) merged[k] = v
  return merged
}
