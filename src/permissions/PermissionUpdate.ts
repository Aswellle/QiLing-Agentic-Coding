/**
 * Permission update types — ported from CC's utils/permissions/PermissionUpdateSchema.ts
 *
 * Used by shellRuleMatching and the permission manager to suggest and apply
 * changes to the allow/deny rule lists.
 */

export type PermissionUpdateDestination =
  | 'globalSettings'   // ~/.qiling/settings.json
  | 'localSettings'    // .qiling/settings.json (project)
  | 'sessionMemory'    // in-memory only, not persisted

export type PermissionRuleValue = {
  toolName: string
  ruleContent?: string
}

export type PermissionUpdate =
  | {
      type: 'addRules'
      rules: PermissionRuleValue[]
      behavior: 'allow' | 'deny'
      destination: PermissionUpdateDestination
    }
  | {
      type: 'removeRules'
      rules: PermissionRuleValue[]
      behavior: 'allow' | 'deny'
      destination: PermissionUpdateDestination
    }
