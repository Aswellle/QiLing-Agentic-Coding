/**
 * Combines settings validation errors with MCP configuration errors.
 */

import { getSettingsWithErrors } from './settings.js'
import type { SettingsWithErrors } from './validation.js'

// FROM CC: getMcpConfigsByScope from services/mcp/config.ts — stub (returns no errors)
const getMcpConfigsByScope = (_scope: string): { errors: SettingsWithErrors['errors'] } => ({
  errors: [],
})

/**
 * Get merged settings with all validation errors, including MCP config errors.
 */
export function getSettingsWithAllErrors(): SettingsWithErrors {
  const result = getSettingsWithErrors()
  const scopes = ['user', 'project', 'local'] as const
  const mcpErrors = scopes.flatMap(scope => getMcpConfigsByScope(scope).errors)
  return {
    settings: result.settings,
    errors: [...result.errors, ...mcpErrors],
  }
}
