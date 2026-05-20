/**
 * Migration: replBridgeEnabled → remoteControlAtStartup
 * Adapted from CC's migrations/migrateReplBridgeEnabledToRemoteControlAtStartup.ts
 *
 * Renames the old implementation-detail config key to user-facing name.
 * Idempotent — only acts when old key exists and new key hasn't been set.
 * Note: wire to saveGlobalConfig when settings module is unified.
 */

export function migrateReplBridgeEnabledToRemoteControlAtStartup(): void {
  // Migration stub — implement when saveGlobalConfig is available in QiLing
}
