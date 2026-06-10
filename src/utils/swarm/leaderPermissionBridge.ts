/**
 * Leader Permission Bridge — adapted from CC's utils/swarm/leaderPermissionBridge.ts
 *
 * Module-level bridge that allows the REPL to register its permission functions
 * for in-process teammates to use when they need permission from the user.
 *
 * When an in-process teammate requests permissions, it uses the standard
 * permission dialog rather than a worker badge.
 */

type SetQueueFn<T> = (updater: (prev: T[]) => T[]) => void;
type SetPermissionContextFn = (context: Record<string, unknown>) => void;

let _setConfirmQueue: SetQueueFn<unknown> | null = null;
let _setPermissionContext: SetPermissionContextFn | null = null;

/**
 * Register the REPL's confirm queue setter.
 * Called during REPL initialization.
 */
export function registerSetConfirmQueue(fn: SetQueueFn<unknown>): void {
  _setConfirmQueue = fn;
}

/**
 * Register the REPL's permission context setter.
 * Called during REPL initialization.
 */
export function registerSetPermissionContext(fn: SetPermissionContextFn): void {
  _setPermissionContext = fn;
}

/** Get the registered confirm queue setter, or null if not registered. */
export function getSetConfirmQueue(): SetQueueFn<unknown> | null {
  return _setConfirmQueue;
}

/** Get the registered permission context setter, or null if not registered. */
export function getSetPermissionContext(): SetPermissionContextFn | null {
  return _setPermissionContext;
}

/** Reset all registered functions. For testing only. */
export function resetLeaderPermissionBridge(): void {
  _setConfirmQueue = null;
  _setPermissionContext = null;
}
