/**
 * Permission result types — adapted from CC's utils/permissions/PermissionResult.ts
 *
 * Re-exports permission types from the central permissions module
 * and provides a behavior description helper.
 */

export type PermissionBehavior = 'allow' | 'deny' | 'ask'

export type PermissionDecisionReason = {
  type: 'tool_rule' | 'glob_rule' | 'classifier' | 'yolo' | 'readonly' | 'plan_mode' | 'other'
  reason?: string
  rule?: string
}

export type PermissionMetadata = {
  ruleContent?: string
}

export type PermissionAllowDecision = {
  behavior: 'allow'
  decisionReason?: PermissionDecisionReason
  metadata?: PermissionMetadata
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
}

export type PermissionDecision =
  | PermissionAllowDecision
  | PermissionDenyDecision
  | PermissionAskDecision

export type PermissionResult = PermissionDecision

/**
 * Get a prose description for a permission behavior.
 */
export function getRuleBehaviorDescription(
  behavior: PermissionBehavior,
): string {
  switch (behavior) {
    case 'allow': return 'allowed'
    case 'deny':  return 'denied'
    default:      return 'asked for confirmation for'
  }
}
