/**
 * Permission update schema — adapted from CC's utils/permissions/PermissionUpdateSchema.ts
 *
 * Type definitions and Zod schemas for permission rule updates.
 */

import { z } from 'zod'
import { lazySchema } from '../lazySchema.js'
import { externalPermissionModeSchema, type PermissionMode } from './PermissionMode.js'
import { permissionBehaviorSchema, permissionRuleValueSchema } from './PermissionRule.js'

export type PermissionUpdateDestination =
  | 'userSettings'
  | 'projectSettings'
  | 'localSettings'
  | 'session'
  | 'cliArg'

export type PermissionRuleValue = {
  toolName: string
  ruleContent?: string
}

export type PermissionUpdate =
  | { type: 'addRules'; rules: PermissionRuleValue[]; behavior: 'allow' | 'deny' | 'ask'; destination: PermissionUpdateDestination }
  | { type: 'replaceRules'; rules: PermissionRuleValue[]; behavior: 'allow' | 'deny' | 'ask'; destination: PermissionUpdateDestination }
  | { type: 'removeRules'; rules: PermissionRuleValue[]; behavior: 'allow' | 'deny' | 'ask'; destination: PermissionUpdateDestination }
  | { type: 'setMode'; mode: PermissionMode; destination: PermissionUpdateDestination }
  | { type: 'addDirectories'; directories: string[]; destination: PermissionUpdateDestination }
  | { type: 'removeDirectories'; directories: string[]; destination: PermissionUpdateDestination }

// FROM CC: Zod schemas for runtime validation
export const permissionUpdateDestinationSchema = lazySchema(() =>
  z.enum(['userSettings', 'projectSettings', 'localSettings', 'session', 'cliArg']),
)

export const permissionUpdateSchema = lazySchema(() =>
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('addRules'), rules: z.array(permissionRuleValueSchema()), behavior: permissionBehaviorSchema(), destination: permissionUpdateDestinationSchema() }),
    z.object({ type: z.literal('replaceRules'), rules: z.array(permissionRuleValueSchema()), behavior: permissionBehaviorSchema(), destination: permissionUpdateDestinationSchema() }),
    z.object({ type: z.literal('removeRules'), rules: z.array(permissionRuleValueSchema()), behavior: permissionBehaviorSchema(), destination: permissionUpdateDestinationSchema() }),
    z.object({ type: z.literal('setMode'), mode: externalPermissionModeSchema(), destination: permissionUpdateDestinationSchema() }),
    z.object({ type: z.literal('addDirectories'), directories: z.array(z.string()), destination: permissionUpdateDestinationSchema() }),
    z.object({ type: z.literal('removeDirectories'), directories: z.array(z.string()), destination: permissionUpdateDestinationSchema() }),
  ]),
)
