/**
 * Shell task cleanup — STUB.
 * FROM CC: tasks/LocalShellTask/killShellTasks.js
 * Kills background bash tasks spawned by a finished agent. No-op until
 * LocalShellTask state lands in AppState.tasks.
 */
import type { AppState } from "../../state/AppStateStore.js";

export function killShellTasksForAgent(
  _agentId: string,
  _getAppState: () => AppState,
  _setAppState: (updater: (prev: AppState) => AppState) => void,
): void {}
