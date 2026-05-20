/**
 * Permission update schema — adapted from CC's utils/permissions/PermissionUpdateSchema.ts
 *
 * Type definitions for permission rule updates.
 * Kept minimal to avoid circular dependencies.
 */

export type PermissionUpdateDestination =
  | 'userSettings'
  | 'projectSettings'
  | 'localSettings'
  | 'session'
  | 'cliArg'

export type PermissionRuleValue = {
  toolName: string
  ruleContent: string
}

export type PermissionUpdate =
  | { type: 'addRules'; rules: PermissionRuleValue[]; behavior: 'allow' | 'deny'; destination: PermissionUpdateDestination }
  | { type: 'replaceRules'; rules: PermissionRuleValue[]; behavior: 'allow' | 'deny'; destination: PermissionUpdateDestination }
  | { type: 'removeRules'; rules: PermissionRuleValue[]; behavior: 'allow' | 'deny'; destination: PermissionUpdateDestination }
  | { type: 'setMode'; mode: string; destination: PermissionUpdateDestination }
  | { type: 'addDirectories'; directories: string[]; destination: PermissionUpdateDestination }
  | { type: 'removeDirectories'; directories: string[]; destination: PermissionUpdateDestination }
