// FROM CC: types/permissions.ts (partial stub)
// Full CC file is 441 lines with bun-bundle deps; only key types ported here.
// Remaining types deferred until T6 layer complete.

/**
 * Source of a permission rule.
 */
export type PermissionRuleSource =
  | 'userSettings'
  | 'projectSettings'
  | 'localSettings'
  | 'flagSettings'
  | 'policySettings'
  | 'cliArg'
  | 'session'
  | 'apiArg'

export type WorkingDirectorySource = PermissionRuleSource

/**
 * An additional directory included in permission scope.
 */
export type AdditionalWorkingDirectory = {
  path: string
  source: WorkingDirectorySource
}

/**
 * Metadata for a pending classifier check that runs asynchronously.
 */
export type PendingClassifierCheck = {
  command: string
  cwd: string
  descriptions: string[]
}
