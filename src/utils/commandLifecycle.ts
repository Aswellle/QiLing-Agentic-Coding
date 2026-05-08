/**
 * Command lifecycle notifications — ported from CC's utils/commandLifecycle.ts (verbatim)
 *
 * Used to notify the REPL when queued commands start/complete so it can
 * update the command queue UI (e.g., mark commands as in-progress/done).
 */

type CommandLifecycleState = 'started' | 'completed'
type CommandLifecycleListener = (uuid: string, state: CommandLifecycleState) => void

let listener: CommandLifecycleListener | null = null

export function setCommandLifecycleListener(cb: CommandLifecycleListener | null): void {
  listener = cb
}

export function notifyCommandLifecycle(uuid: string, state: CommandLifecycleState): void {
  listener?.(uuid, state)
}
