// FROM CC: utils/permissions/PermissionResult.ts + types/permissions.ts (merged)
// Extended to match CC's full type system; backwards-compatible with QiLing's
// original simplified types.

import type { PendingClassifierCheck } from '../../types/permissions.js'
import type { PermissionUpdate } from './PermissionUpdateSchema.js'
import type { PermissionRule } from './PermissionRule.js'

export type PermissionBehavior = 'allow' | 'deny' | 'ask'

export type PermissionDecisionReason =
  | {
      type: 'tool_rule' | 'glob_rule' | 'classifier' | 'yolo' | 'readonly' | 'plan_mode' | 'other'
      reason?: string
      rule?: string
    }
  | {
      type: 'rule'
      rule: PermissionRule
      reason?: string
    }
  | {
      type: 'subcommandResults'
      reasons: Map<string, PermissionResult>
      reason?: string
    }

export type PermissionMetadata = {
  ruleContent?: string
}

export type PermissionAllowDecision<Input = unknown> = {
  behavior: 'allow'
  updatedInput?: Input
  userModified?: boolean
  decisionReason?: PermissionDecisionReason
  metadata?: PermissionMetadata
  acceptFeedback?: string
}

export type PermissionDenyDecision = {
  behavior: 'deny'
  message?: string
  decisionReason?: PermissionDecisionReason
  metadata?: PermissionMetadata
}

export type PermissionAskDecision = {
  behavior: 'ask'
  message?: string
  decisionReason?: PermissionDecisionReason
  metadata?: PermissionMetadata
  suggestions?: PermissionUpdate[]
  pendingClassifierCheck?: PendingClassifierCheck
}

export type PermissionPassthroughDecision = {
  behavior: 'passthrough'
  message?: string
  decisionReason?: PermissionDecisionReason
  suggestions?: PermissionUpdate[]
}

export type PermissionDecision =
  | PermissionAllowDecision
  | PermissionDenyDecision
  | PermissionAskDecision

export type PermissionResult =
  | PermissionAllowDecision
  | PermissionDenyDecision
  | PermissionAskDecision
  | PermissionPassthroughDecision

export function getRuleBehaviorDescription(
  behavior: PermissionBehavior,
): string {
  switch (behavior) {
    case 'allow': return 'allowed'
    case 'deny':  return 'denied'
    default:      return 'asked for confirmation for'
  }
}
