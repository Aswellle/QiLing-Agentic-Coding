// Union of all concrete task state types
// Use this for components that need to work with any task type
//
// FROM CC: tasks/types.ts unions 7 task state types (LocalShell, LocalAgent,
// RemoteAgent, InProcessTeammate, LocalWorkflow, MonitorMcp, Dream). Only the
// task types ported so far are included; extend this union as each task type
// lands so the exported shape converges on the reference.

import type { InProcessTeammateTaskState } from "./InProcessTeammateTask/types.js";

export type TaskState = InProcessTeammateTaskState;

// Task types that can appear in the background tasks indicator
export type BackgroundTaskState = InProcessTeammateTaskState;

/**
 * Check if a task should be shown in the background tasks indicator.
 * A task is considered a background task if:
 * 1. It is running or pending
 * 2. It has been explicitly backgrounded (not a foreground task)
 */
export function isBackgroundTask(task: TaskState): task is BackgroundTaskState {
  if (task.status !== "running" && task.status !== "pending") {
    return false;
  }
  // Foreground tasks (isBackgrounded === false) are not yet "background tasks"
  if ("isBackgrounded" in task && task.isBackgrounded === false) {
    return false;
  }
  return true;
}
