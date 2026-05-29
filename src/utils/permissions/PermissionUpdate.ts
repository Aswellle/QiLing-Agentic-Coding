// FROM CC: utils/permissions/PermissionUpdate.ts (partial)
// Full file is 389 lines; settings-persistence functions deferred (QiLing settings
// API differs from CC). extractRules + createReadRuleSuggestion ported; apply/persist
// stubs added for interface compatibility.

import { posix } from 'path'
import type { ToolPermissionContext } from '../../Tool.js'
import type {
  AdditionalWorkingDirectory,
  WorkingDirectorySource,
} from '../../types/permissions.js'
import type { PermissionRuleValue } from './PermissionRule.js'
import type {
  PermissionUpdate,
  PermissionUpdateDestination,
} from './PermissionUpdateSchema.js'
import { permissionRuleValueToString } from './permissionRuleParser.js'

// Re-export for backwards compatibility
export type { AdditionalWorkingDirectory, WorkingDirectorySource }

export function extractRules(
  updates: PermissionUpdate[] | undefined,
): PermissionRuleValue[] {
  if (!updates) return []
  return updates.flatMap(update => {
    switch (update.type) {
      case 'addRules':
        return update.rules
      default:
        return []
    }
  })
}

export function hasRules(updates: PermissionUpdate[] | undefined): boolean {
  return extractRules(updates).length > 0
}

export function applyPermissionUpdate(
  context: ToolPermissionContext,
  update: PermissionUpdate,
): ToolPermissionContext {
  switch (update.type) {
    case 'setMode':
      return { ...context, mode: update.mode }
    case 'addRules': {
      const ruleStrings = update.rules.map(permissionRuleValueToString)
      const ruleKind =
        update.behavior === 'allow'
          ? 'alwaysAllowRules'
          : update.behavior === 'deny'
            ? 'alwaysDenyRules'
            : 'alwaysAskRules'
      return {
        ...context,
        [ruleKind]: {
          ...context[ruleKind],
          [update.destination]: [
            ...(context[ruleKind][update.destination] || []),
            ...ruleStrings,
          ],
        },
      }
    }
    case 'replaceRules': {
      const ruleStrings = update.rules.map(permissionRuleValueToString)
      const ruleKind =
        update.behavior === 'allow'
          ? 'alwaysAllowRules'
          : update.behavior === 'deny'
            ? 'alwaysDenyRules'
            : 'alwaysAskRules'
      return {
        ...context,
        [ruleKind]: {
          ...context[ruleKind],
          [update.destination]: ruleStrings,
        },
      }
    }
    case 'addDirectories': {
      const newAdditionalDirs = new Map(context.additionalWorkingDirectories)
      for (const directory of update.directories) {
        newAdditionalDirs.set(directory, { path: directory, source: update.destination })
      }
      return { ...context, additionalWorkingDirectories: newAdditionalDirs }
    }
    case 'removeRules': {
      const ruleStrings = new Set(update.rules.map(permissionRuleValueToString))
      const ruleKind =
        update.behavior === 'allow'
          ? 'alwaysAllowRules'
          : update.behavior === 'deny'
            ? 'alwaysDenyRules'
            : 'alwaysAskRules'
      return {
        ...context,
        [ruleKind]: {
          ...context[ruleKind],
          [update.destination]: (context[ruleKind][update.destination] || []).filter(
            (r: string) => !ruleStrings.has(r),
          ),
        },
      }
    }
    case 'removeDirectories': {
      const newAdditionalDirs = new Map(context.additionalWorkingDirectories)
      for (const directory of update.directories) {
        newAdditionalDirs.delete(directory)
      }
      return { ...context, additionalWorkingDirectories: newAdditionalDirs }
    }
    default:
      return context
  }
}

export function applyPermissionUpdates(
  context: ToolPermissionContext,
  updates: PermissionUpdate[],
): ToolPermissionContext {
  let ctx = context
  for (const update of updates) ctx = applyPermissionUpdate(ctx, update)
  return ctx
}

export function supportsPersistence(
  destination: PermissionUpdateDestination,
): boolean {
  return (
    destination === 'localSettings' ||
    destination === 'userSettings' ||
    destination === 'projectSettings'
  )
}

// LOC: settings persistence deferred — QiLing settings API differs from CC
export function persistPermissionUpdate(_update: PermissionUpdate): void {}
export function persistPermissionUpdates(_updates: PermissionUpdate[]): void {}

export function createReadRuleSuggestion(
  dirPath: string,
  destination: PermissionUpdateDestination = 'session',
): PermissionUpdate | undefined {
  // Convert Windows backslashes to posix for pattern matching
  const pathForPattern = dirPath.replace(/\\/g, '/')
  if (pathForPattern === '/') return undefined

  const ruleContent = posix.isAbsolute(pathForPattern)
    ? `/${pathForPattern}/**`
    : `${pathForPattern}/**`

  return {
    type: 'addRules',
    rules: [{ toolName: 'Read', ruleContent }],
    behavior: 'allow',
    destination,
  }
}
