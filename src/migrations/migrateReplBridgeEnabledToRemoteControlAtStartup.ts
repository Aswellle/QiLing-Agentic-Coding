/**
 * Migration: replBridgeEnabled → remoteControlAtStartup
 * Adapted from CC's migrations/migrateReplBridgeEnabledToRemoteControlAtStartup.ts
 *
 * Renames the old implementation-detail config key to user-facing name.
 * Idempotent — only acts when old key exists and new key hasn't been set.
 *
 * QiLing: QiLing never shipped with `replBridgeEnabled` in its settings.
 * The target field `remoteControlAtStartup` is checked via settings schema.
 * This migration is safe to call on every startup — it is a no-op when the
 * legacy key is absent (which is always the case in QiLing).
 */

import { logForDebugging } from '../utils/log.js'
import { saveGlobalSettings } from '../settings/loader.js'

export function migrateReplBridgeEnabledToRemoteControlAtStartup(): void {
  // QiLing never stored replBridgeEnabled — safe no-op.
  // Kept as a real function (not deleted) so the migration registry can call
  // it without conditional checks, matching CC's migration runner pattern.
  logForDebugging('[migration] migrateReplBridgeEnabledToRemoteControlAtStartup: no-op (QL never used replBridgeEnabled)')
}
