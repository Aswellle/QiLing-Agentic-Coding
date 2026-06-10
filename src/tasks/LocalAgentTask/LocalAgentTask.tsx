/**
 * LocalAgentTask — STUB.
 * FROM CC: tasks/LocalAgentTask/LocalAgentTask.tsx (682L)
 * Minimal export surface for agentToolUtils. Full port pending.
 */
import type { Message } from "../../types/message.js";
import type { AppState } from "../../state/AppStateStore.js";
import type { ToolPermissionContext } from "../../Tool.js";

export type ProgressTracker = Record<string, unknown>;
export function createProgressTracker(): ProgressTracker { return {}; }
export function createActivityDescriptionResolver(_tools: unknown): (id: string) => string {
  return () => "";
}
export function updateProgressFromMessage(_t: ProgressTracker, _m: Message, _r: unknown, _tools: unknown): void {}
export function getProgressUpdate(_t: ProgressTracker): { lastActivity?: { activityDescription: string }; tokenCount: number; toolUseCount: number } {
  return { tokenCount: 0, toolUseCount: 0 };
}
export function getTokenCountFromTracker(_t: ProgressTracker): number { return 0; }
export function enqueueAgentNotification(_p: {
  taskId: string; description: string; status: string; setAppState: (f: (p: AppState) => AppState) => void;
  finalMessage?: string; error?: string; usage?: unknown; toolUseId?: string;
  worktreePath?: string; worktreeBranch?: string;
}): void {}
export function completeAgentTask(_r: unknown, _s: (f: (p: AppState) => AppState) => void): void {}
export function failAgentTask(_id: string, _msg: string, _s: (f: (p: AppState) => AppState) => void): void {}
export function killAsyncAgent(_id: string, _s: (f: (p: AppState) => AppState) => void): void {}
export function updateAgentProgress(_id: string, _p: unknown, _s: (f: (p: AppState) => AppState) => void): void {}
export function isLocalAgentTask(_t: unknown): _t is { retain?: boolean; messages?: Message[] } {
  return false;
}
export type AgentProgress = unknown;

