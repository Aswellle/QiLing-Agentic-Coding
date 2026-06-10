// Union of all concrete task state types
// Use this for components that need to work with any task type
//
// FROM CC: tasks/types.ts unions 7 task state types (LocalShell, LocalAgent,
// RemoteAgent, InProcessTeammate, LocalWorkflow, MonitorMcp, Dream). Only the
// task types ported so far are included; extend this union as each task type
// lands so the exported shape converges on the reference.

import type { InProcessTeammateTaskState } from "./InProcessTeammateTask/types.js";
// FROM CC: TaskState union includes LocalShellTaskState, LocalAgentTaskState,
// RemoteAgentTaskState, LocalWorkflowTaskState, MonitorMcpTaskState,
// DreamTaskState. These types are not yet ported; their task state types are
// approximated via a loose index signature so existing switch-based consumers
// (pillLabel, stopTask) compile.
export type LocalShellTaskState = InProcessTeammateTaskState & { type: "local_bash"; command?: string; kind?: string; isBackgrounded?: boolean; };
export type LocalAgentTaskState = InProcessTeammateTaskState & { type: "local_agent"; retain?: boolean; };
export type RemoteAgentTaskState = InProcessTeammateTaskState & { type: "remote_agent"; isUltraplan?: boolean; ultraplanPhase?: string; };
export type LocalWorkflowTaskState = InProcessTeammateTaskState & { type: "local_workflow"; };
export type MonitorMcpTaskState = InProcessTeammateTaskState & { type: "monitor_mcp"; };
export type DreamTaskState = InProcessTeammateTaskState & { type: "dream"; };

export type TaskState =
  | InProcessTeammateTaskState
  | LocalShellTaskState
  | LocalAgentTaskState
  | RemoteAgentTaskState
  | LocalWorkflowTaskState
  | MonitorMcpTaskState
  | DreamTaskState;

export type BackgroundTaskState = TaskState;

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
