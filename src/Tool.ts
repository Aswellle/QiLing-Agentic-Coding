// FROM CC: Tool.ts (compatibility shim for CC-ported permission/tool code)
// QiLing's own tool system uses src/types/tool.ts; this file provides
// the CC-compatible types needed by ported permission files.

import type { AppState } from "./state/AppStateStore.js";
import type { AdditionalWorkingDirectory } from "./types/permissions.js";
import type { Tool } from "./types/tool.js";
import type { PermissionMode } from "./utils/permissions/PermissionMode.js";

export type { Tool };
export type AnyObject = import("zod").ZodType<{ [key: string]: unknown }>;
export type ValidationResult =
  | { result: true }
  | { result: false; message: string };

/** Source-keyed permission rule map (CC: { session: string[], project: string[], ... }) */
export type ToolPermissionRulesBySource = Record<string, string[]>;

export type ToolPermissionContext = {
  mode: PermissionMode;
  additionalWorkingDirectories: Map<string, AdditionalWorkingDirectory>;
  alwaysAllowRules: ToolPermissionRulesBySource;
  alwaysDenyRules: ToolPermissionRulesBySource;
  alwaysAskRules: ToolPermissionRulesBySource;
  isBypassPermissionsModeAvailable: boolean;
  isAutoModeAvailable?: boolean;
  shouldAvoidPermissionPrompts?: boolean;
  awaitAutomatedChecksBeforeDialog?: boolean;
  prePlanMode?: PermissionMode;
};

export function getEmptyToolPermissionContext(): ToolPermissionContext {
  return {
    mode: "default",
    additionalWorkingDirectories: new Map(),
    alwaysAllowRules: {},
    alwaysDenyRules: {},
    alwaysAskRules: {},
    isBypassPermissionsModeAvailable: false,
  };
}

export type ToolUseContext = {
  getAppState(): AppState;
  setAppState: (updater: (prev: AppState) => AppState) => void;
  abortController: AbortController;
  options: {
    isNonInteractiveSession: boolean;
    [key: string]: unknown;
  };
};
