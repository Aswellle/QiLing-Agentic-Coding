/**
 * Unified command queue (module-level, independent of React state).
 *
 * All commands — user input, task notifications, orphaned permissions — go
 * through this single queue. React components subscribe via
 * useSyncExternalStore (subscribeToCommandQueue / getCommandQueueSnapshot).
 * Non-React code reads directly via getCommandQueue() / getCommandQueueLength().
 *
 * Priority determines dequeue order: 'now' > 'next' > 'later'.
 * Within the same priority, commands are processed FIFO.
 *
 * FROM CC: utils/messageQueueManager.ts — PARTIAL port. The reference file's
 * text-input/image integration (extractQueuedText, paste handling) depends on
 * types/textInputTypes.ts + types/messageQueueTypes.ts which are not yet
 * ported; QueuedCommand below is the subset of fields used by current
 * consumers. Move the type to types/textInputTypes.ts when that file lands.
 */

import { getSessionId } from "../bootstrap/state.js";
import { logForDebugging } from "./debug.js";
import { createSignal } from "./signal.js";

export type QueuePriority = "now" | "next" | "later";

/**
 * Queued command type.
 * FROM CC: full QueuedCommand lives in types/textInputTypes.ts (not yet
 * ported); fields below are the subset consumed by the queue core and the
 * task-notification path.
 */
export type QueuedCommand = {
  value: string;
  mode: string;
  /** Defaults to the priority implied by `mode` when enqueued. */
  priority?: QueuePriority;
  uuid?: string;
  /**
   * When true, the input is treated as plain text even if it starts with `/`.
   * Used for remotely-received messages that should not trigger local slash
   * commands or skills.
   */
  skipSlashCommands?: boolean;
  /**
   * Agent that should receive this notification. Undefined = main thread.
   * Subagents run in-process and share the module-level command queue; drain
   * gates filter by this field so a subagent's background task notifications
   * don't leak into the coordinator's context.
   */
  agentId?: string;
};

type QueueOperation = "enqueue" | "dequeue" | "remove";

// ============================================================================
// Logging helper
// ============================================================================

// FROM CC: recordQueueOperation persisted queue ops to session storage;
// QiLing sessionStorage has no queue-op channel yet — debug log only.
function logOperation(operation: QueueOperation, content?: string): void {
  logForDebugging(
    `[messageQueue] ${operation} session=${getSessionId()}${content !== undefined ? ` content=${content.slice(0, 80)}` : ""}`,
  );
}

const commandQueue: QueuedCommand[] = [];
/** Frozen snapshot — recreated on every mutation for useSyncExternalStore. */
let snapshot: readonly QueuedCommand[] = Object.freeze([]);
const queueChanged = createSignal();

function notifySubscribers(): void {
  snapshot = Object.freeze([...commandQueue]);
  queueChanged.emit();
}

// ============================================================================
// useSyncExternalStore interface
// ============================================================================

/**
 * Subscribe to command queue changes.
 * Compatible with React's useSyncExternalStore.
 */
export const subscribeToCommandQueue = queueChanged.subscribe;

/**
 * Get current snapshot of the command queue.
 * Compatible with React's useSyncExternalStore.
 * Returns a frozen array that only changes reference on mutation.
 */
export function getCommandQueueSnapshot(): readonly QueuedCommand[] {
  return snapshot;
}

// ============================================================================
// Read operations (for non-React code)
// ============================================================================

/**
 * Get a mutable copy of the current queue.
 * Use for one-off reads where you need the actual commands.
 */
export function getCommandQueue(): QueuedCommand[] {
  return [...commandQueue];
}

/**
 * Get the current queue length without copying.
 */
export function getCommandQueueLength(): number {
  return commandQueue.length;
}

/**
 * Check if there are commands in the queue.
 */
export function hasCommandsInQueue(): boolean {
  return commandQueue.length > 0;
}

/**
 * Trigger a re-check by notifying subscribers.
 * Use after async processing completes to ensure remaining commands
 * are picked up by useSyncExternalStore consumers.
 */
export function recheckCommandQueue(): void {
  if (commandQueue.length > 0) {
    notifySubscribers();
  }
}

// ============================================================================
// Write operations
// ============================================================================

/**
 * Add a command to the queue.
 * Used for user-initiated commands (prompt, bash, orphaned-permission).
 * Defaults priority to 'next' (processed before task notifications).
 */
export function enqueue(command: QueuedCommand): void {
  commandQueue.push({ ...command, priority: command.priority ?? "next" });
  notifySubscribers();
  logOperation(
    "enqueue",
    typeof command.value === "string" ? command.value : undefined,
  );
}

/**
 * Add a task notification to the queue.
 * Convenience wrapper that defaults priority to 'later' so user input
 * is never starved by system messages.
 */
export function enqueuePendingNotification(command: QueuedCommand): void {
  commandQueue.push({ ...command, priority: command.priority ?? "later" });
  notifySubscribers();
  logOperation(
    "enqueue",
    typeof command.value === "string" ? command.value : undefined,
  );
}

const PRIORITY_ORDER: Record<QueuePriority, number> = {
  now: 0,
  next: 1,
  later: 2,
};

/**
 * Remove and return the highest-priority command, or undefined if empty.
 * Within the same priority level, commands are dequeued FIFO.
 *
 * An optional `filter` narrows the candidates: only commands for which the
 * predicate returns `true` are considered. Non-matching commands stay in the
 * queue untouched. This lets between-turn drains restrict to main-thread
 * commands (`cmd.agentId === undefined`) without restructuring the existing
 * while-loop patterns.
 */
export function dequeue(
  filter?: (cmd: QueuedCommand) => boolean,
): QueuedCommand | undefined {
  if (commandQueue.length === 0) {
    return undefined;
  }

  // Find the first command with the highest priority (respecting filter)
  let bestIdx = -1;
  let bestPriority = Number.POSITIVE_INFINITY;
  for (let i = 0; i < commandQueue.length; i++) {
    const cmd = commandQueue[i]!;
    if (filter && !filter(cmd)) continue;
    const priority = PRIORITY_ORDER[cmd.priority ?? "next"];
    if (priority < bestPriority) {
      bestIdx = i;
      bestPriority = priority;
    }
  }

  if (bestIdx === -1) return undefined;

  const [dequeued] = commandQueue.splice(bestIdx, 1);
  notifySubscribers();
  logOperation("dequeue");
  return dequeued;
}

/**
 * Remove and return all commands from the queue.
 * Logs a dequeue operation for each command.
 */
export function dequeueAll(): QueuedCommand[] {
  if (commandQueue.length === 0) {
    return [];
  }

  const commands = [...commandQueue];
  commandQueue.length = 0;
  notifySubscribers();

  for (const _cmd of commands) {
    logOperation("dequeue");
  }

  return commands;
}

/**
 * Return the highest-priority command without removing it, or undefined if empty.
 * Accepts an optional `filter` — only commands passing the predicate are considered.
 */
export function peek(
  filter?: (cmd: QueuedCommand) => boolean,
): QueuedCommand | undefined {
  if (commandQueue.length === 0) {
    return undefined;
  }
  let bestIdx = -1;
  let bestPriority = Number.POSITIVE_INFINITY;
  for (let i = 0; i < commandQueue.length; i++) {
    const cmd = commandQueue[i]!;
    if (filter && !filter(cmd)) continue;
    const priority = PRIORITY_ORDER[cmd.priority ?? "next"];
    if (priority < bestPriority) {
      bestIdx = i;
      bestPriority = priority;
    }
  }
  if (bestIdx === -1) return undefined;
  return commandQueue[bestIdx];
}

/**
 * Remove and return all commands matching a predicate, preserving priority order.
 * Non-matching commands stay in the queue.
 */
export function dequeueAllMatching(
  predicate: (cmd: QueuedCommand) => boolean,
): QueuedCommand[] {
  const matched: QueuedCommand[] = [];
  const remaining: QueuedCommand[] = [];
  for (const cmd of commandQueue) {
    if (predicate(cmd)) {
      matched.push(cmd);
    } else {
      remaining.push(cmd);
    }
  }
  if (matched.length === 0) {
    return [];
  }
  commandQueue.length = 0;
  commandQueue.push(...remaining);
  notifySubscribers();
  for (const _cmd of matched) {
    logOperation("dequeue");
  }
  return matched;
}

/**
 * Remove specific commands from the queue by reference identity.
 * Callers must pass the same object references that are in the queue
 * (e.g. from getCommandsByMaxPriority). Logs a 'remove' operation for each.
 */
export function remove(commandsToRemove: QueuedCommand[]): void {
  if (commandsToRemove.length === 0) {
    return;
  }

  const before = commandQueue.length;
  for (let i = commandQueue.length - 1; i >= 0; i--) {
    if (commandsToRemove.includes(commandQueue[i]!)) {
      commandQueue.splice(i, 1);
    }
  }

  if (commandQueue.length !== before) {
    notifySubscribers();
  }

  for (const _cmd of commandsToRemove) {
    logOperation("remove");
  }
}

/**
 * Reset the queue to empty without logging (test helper).
 */
export function resetCommandQueue(): void {
  commandQueue.length = 0;
  notifySubscribers();
}

/**
 * Clear all commands from the queue.
 */
export function clearCommandQueue(): void {
  if (commandQueue.length === 0) {
    return;
  }
  const count = commandQueue.length;
  commandQueue.length = 0;
  notifySubscribers();
  for (let i = 0; i < count; i++) {
    logOperation("remove");
  }
}

// ============================================================================
// Backward-compatible aliases (deprecated — prefer new names)
// ============================================================================

/** @deprecated Use subscribeToCommandQueue */
export const subscribeToPendingNotifications = subscribeToCommandQueue;

/** @deprecated Use getCommandQueueSnapshot */
export function getPendingNotificationsSnapshot(): readonly QueuedCommand[] {
  return snapshot;
}

/** @deprecated Use hasCommandsInQueue */
export const hasPendingNotifications = hasCommandsInQueue;

/** @deprecated Use getCommandQueueLength */
export const getPendingNotificationsCount = getCommandQueueLength;

/** @deprecated Use recheckCommandQueue */
export const recheckPendingNotifications = recheckCommandQueue;

/** @deprecated Use dequeue */
export function dequeuePendingNotification(): QueuedCommand | undefined {
  return dequeue();
}

/** @deprecated Use resetCommandQueue */
export const resetPendingNotifications = resetCommandQueue;

/** @deprecated Use clearCommandQueue */
export const clearPendingNotifications = clearCommandQueue;

/**
 * Get commands at or above a given priority level without removing them.
 * Useful for mid-chain draining where only urgent items should be processed.
 *
 * Priority order: 'now' (0) > 'next' (1) > 'later' (2).
 * Passing 'now' returns only now-priority commands; 'later' returns everything.
 */
export function getCommandsByMaxPriority(
  maxPriority: QueuePriority,
): QueuedCommand[] {
  const threshold = PRIORITY_ORDER[maxPriority];
  return commandQueue.filter(
    (cmd) => PRIORITY_ORDER[cmd.priority ?? "next"] <= threshold,
  );
}

/**
 * Returns true if the command is a slash command that should be routed through
 * processSlashCommand rather than sent to the model as text.
 *
 * Commands with `skipSlashCommands` (e.g. remotely-received messages) are NOT
 * treated as slash commands — their text is meant for the model.
 */
export function isSlashCommand(cmd: QueuedCommand): boolean {
  return (
    typeof cmd.value === "string" &&
    cmd.value.trim().startsWith("/") &&
    !cmd.skipSlashCommands
  );
}
