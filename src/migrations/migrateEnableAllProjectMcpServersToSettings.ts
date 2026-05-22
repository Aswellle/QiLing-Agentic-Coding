/**
 * Migration: enableAllProjectMcpServers / enabledMcpjsonServers → local settings
 * Adapted from CC's migrations/migrateEnableAllProjectMcpServersToSettings.ts
 *
 * QiLing: MCP server configuration lives directly in settings.json under
 * `mcpServers` (Zod-validated). There is no intermediate projectConfig layer
 * with `enableAllProjectMcpServers` / `enabledMcpjsonServers` fields.
 * This migration is a no-op stub.
 */

import { logForDebugging } from '../utils/log.js'

export function migrateEnableAllProjectMcpServersToSettings(): void {
  // No-op: QiLing stores MCP server config directly in settings.json,
  // not in the legacy projectConfig format this migration targets.
  logForDebugging('[migration] migrateEnableAllProjectMcpServersToSettings: no-op (QL MCP config in settings.json)')
}
