/**
 * CanUseToolFn — permission hook signature for tool decision.
 * FROM CC: hooks/useCanUseTool.js (type-only port)
 */
import type { ToolUseContext } from "../Tool.js";

export type CanUseToolFn = (
  toolName: string,
  toolInput: Record<string, unknown>,
  context: ToolUseContext,
) => Promise<boolean>;

