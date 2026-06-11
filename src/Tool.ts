// FROM CC: Tool.ts (compatibility shim for CC-ported permission/tool code)
// QiLing's own tool system uses src/types/tool.ts; this file provides
// the CC-compatible types needed by ported permission files.

import type { AppState } from "./state/AppStateStore.js";
import type { MCPServerConnection } from "./services/mcp/types.js";
import type { AgentDefinition } from "./tools/AgentTool/loadAgentsDir.js";
import type { Message } from "./types/message.js";
import type { FileStateCache } from "./utils/fileStateCache.js";
import type { ContentReplacementState } from "./utils/toolResultStorage.js";
import type { Tool } from "./types/tool.js";

export type { Tool };
export const toolMatchesName = (tool: { name: string }, name: string): boolean => tool.name === name;
export type Tools = Tool[];
export type AnyObject = import("zod").ZodType<{ [key: string]: unknown }>;
export type ValidationResult =
  | { result: true }
  | { result: false; message: string };

// Single source of truth for the permission context lives in AppStateStore
// (QiLing fields + CC-compat fields). Re-exported here so CC-ported code
// importing from Tool.js keeps working.
export type {
  ToolPermissionContext,
  ToolPermissionRulesBySource,
} from "./state/AppStateStore.js";
export { getEmptyToolPermissionContext } from "./state/AppStateStore.js";

export type ToolUseContext = {
  getAppState(): AppState;
  setAppState: (updater: (prev: AppState) => AppState) => void;
  abortController: AbortController;
  toolUseId?: string;
  // CC-compat optional fields — referenced by ported agent/permission code
  // (forkedAgent, runAgent, agentToolUtils). All optional: QiLing's main
  // loop contexts don't populate them.
  /** Always-shared setAppState for session-scoped infrastructure (CC) */
  setAppStateForTasks?: (updater: (prev: AppState) => AppState) => void;
  readFileState?: FileStateCache;
  /** Only set for subagents (CC) */
  agentId?: string;
  agentType?: string;
  messages?: Message[];
  userModified?: boolean;
  preserveToolUseResults?: boolean;
  fileReadingLimits?: { maxTokens?: number; maxSizeBytes?: number };
  queryTracking?: { chainId: string; depth: number };
  /** Local denial tracking for async subagents whose setAppState is a no-op (CC) */
  localDenialTracking?: unknown;
  /** Per-thread content replacement state for the tool result budget (CC) */
  contentReplacementState?: ContentReplacementState;
  setResponseLength?: (f: (prev: number) => number) => void;
  pushApiMetricsEntry?: (ttftMs: number) => void;
  updateAttributionState?: (updater: (prev: never) => never) => void;
  setStreamMode?: (mode: unknown) => void;
  onCompactProgress?: (event: unknown) => void;
  nestedMemoryAttachmentTriggers?: Set<string>;
  loadedNestedMemoryPaths?: Set<string>;
  dynamicSkillDirTriggers?: Set<string>;
  discoveredSkillNames?: Set<string>;
  toolDecisions?: unknown;
  setInProgressToolUseIDs?: (f: (prev: Set<string>) => Set<string>) => void;
  setHasInterruptibleToolInProgress?: (v: boolean) => void;
  updateFileHistoryState?: (updater: (prev: never) => never) => void;
  addNotification?: ((notif: never) => void) | undefined;
  setToolJSX?: unknown;
  setSDKStatus?: unknown;
  openMessageSelector?: () => void;
  criticalSystemReminder_EXPERIMENTAL?: string;
  /** When true, canUseTool must always be called even when hooks auto-approve (CC) */
  requireCanUseTool?: boolean;
  options: {
    isNonInteractiveSession: boolean;
    tools?: Tool[];
    mainLoopModel?: string;
    mcpClients?: MCPServerConnection[];
    agentDefinitions?: { activeAgents: AgentDefinition[] };
    [key: string]: unknown;
  };
};
