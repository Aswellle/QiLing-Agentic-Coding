// FROM CC: utils/permissions/permissions.ts (stub — 1486 lines, deferred)
// Only the exports needed by bashPermissions.ts + other T1 files are implemented.
// Full port requires filesystem.ts + settings layer alignment.

import type { ToolPermissionContext } from '../../Tool.js'
import type { PermissionBehavior } from './PermissionResult.js'
import type { PermissionDecisionReason } from './PermissionResult.js'
import type { PermissionRule } from './PermissionRule.js'

export function createPermissionRequestMessage(
  toolName: string,
  decisionReason?: PermissionDecisionReason,
): string {
  if (
    decisionReason &&
    'reason' in decisionReason &&
    typeof decisionReason.reason === 'string' &&
    decisionReason.reason
  ) {
    return `${toolName} requires permission: ${decisionReason.reason}`
  }
  return `${toolName} requires permission`
}

export function getRuleByContentsForTool(
  context: ToolPermissionContext,
  tool: { name: string },
  behavior: PermissionBehavior,
): Map<string, PermissionRule> {
  const result = new Map<string, PermissionRule>()
  const ruleKind =
    behavior === 'allow'
      ? 'alwaysAllowRules'
      : behavior === 'deny'
        ? 'alwaysDenyRules'
        : 'alwaysAskRules'

  const rulesBySource = context[ruleKind] ?? {}
  for (const [source, rules] of Object.entries(rulesBySource)) {
    if (!Array.isArray(rules)) continue
    for (const ruleContent of rules as string[]) {
      if (typeof ruleContent !== 'string') continue
      if (
        ruleContent === tool.name ||
        ruleContent.startsWith(`${tool.name}(`) ||
        ruleContent.startsWith(`${tool.name}:`)
      ) {
        result.set(ruleContent, {
          behavior,
          ruleValue: { toolName: tool.name, ruleContent },
          source: source as any,
        })
      }
    }
  }
  return result
}

export function getRuleByContentsForToolName(
  context: ToolPermissionContext,
  toolName: string,
  behavior: PermissionBehavior,
): Map<string, PermissionRule> {
  return getRuleByContentsForTool(context, { name: toolName }, behavior)
}

// FROM CC: hasPermissionsToUseTool — full permission evaluation pipeline.
// STUB: QiLing's evaluation lives in src/permissions/manager.ts with a
// different interface; bridging is pending the query() runtime bridge.
// Returning 'ask' is the safe default (caller escalates to the leader UI).
export async function hasPermissionsToUseTool(
  _tool: unknown,
  _input: unknown,
  _toolUseContext: unknown,
  _assistantMessage: unknown,
  _toolUseID: string,
): Promise<import("./PermissionResult.js").PermissionDecision> {
  return { behavior: "ask" };
}
