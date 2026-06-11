/**
 * Monitor MCP task — STUB.
 * FROM CC: tasks/MonitorMcpTask/MonitorMcpTask.js
 * No-op until the Monitor tool lands; runAgent's cleanup path is gated on
 * feature('MONITOR_TOOL') anyway.
 */
import type { AppState } from "../../state/AppStateStore.js";

export function killMonitorMcpTasksForAgent(
  _agentId: string,
  _getAppState: () => AppState,
  _setAppState: (updater: (prev: AppState) => AppState) => void,
): void {}
