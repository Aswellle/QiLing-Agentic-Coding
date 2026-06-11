/**
 * CanUseToolFn — permission hook signature for tool decision.
 * FROM CC: hooks/useCanUseTool.tsx (type-only port)
 * Signature matches CC: resolves a full PermissionDecision (not a boolean),
 * with optional forceDecision short-circuit.
 */
import type { Tool, ToolUseContext } from "../Tool.js";
import type { Message } from "../types/message.js";
import type { PermissionDecision } from "../utils/permissions/PermissionResult.js";

export type CanUseToolFn<
  Input extends Record<string, unknown> = Record<string, unknown>,
> = (
  tool: Tool,
  input: Input,
  toolUseContext: ToolUseContext,
  assistantMessage: Message,
  toolUseID: string,
  forceDecision?: PermissionDecision,
) => Promise<PermissionDecision>;
