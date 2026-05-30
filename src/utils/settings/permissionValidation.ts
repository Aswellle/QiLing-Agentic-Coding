// FROM CC: utils/settings/permissionValidation.ts (adapt-new stub)
// Full port deferred — complex permission rule schema validation
import { z } from 'zod/v4'
import { lazySchema } from '../lazySchema.js'

export const PermissionRuleSchema = lazySchema(() => z.string())
export type PermissionRule = string

export type PermissionValidationResult = {
  valid: boolean
  error?: string
  suggestion?: string
}

export function validatePermissionRule(rule: string): PermissionValidationResult {
  if (!rule || rule.trim().length === 0) {
    return { valid: false, error: 'Permission rule cannot be empty' }
  }
  return { valid: true }
}
