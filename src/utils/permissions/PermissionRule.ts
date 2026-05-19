/**
 * Permission rule types — adapted from CC's utils/permissions/PermissionRule.ts
 *
 * Defines the schema and types for permission rules (allow/deny/ask policies).
 */

import { z } from 'zod'
import { lazySchema } from '../lazySchema.js'

export type PermissionBehavior = 'allow' | 'deny' | 'ask'

export type PermissionRuleSource = 'session' | 'project' | 'global' | 'policy'

export type PermissionRuleValue = {
  toolName: string
  ruleContent?: string
}

export type PermissionRule = {
  behavior: PermissionBehavior
  ruleValue: PermissionRuleValue
  source: PermissionRuleSource
}

/**
 * Zod schema for permission behavior validation.
 */
export const permissionBehaviorSchema = lazySchema(() =>
  z.enum(['allow', 'deny', 'ask']),
)

/**
 * Zod schema for permission rule value.
 */
export const permissionRuleValueSchema = lazySchema(() =>
  z.object({
    toolName: z.string(),
    ruleContent: z.string().optional(),
  }),
)
