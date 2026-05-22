/**
 * Migration: autoUpdates → DISABLE_AUTOUPDATER env var in settings
 * Adapted from CC's migrations/migrateAutoUpdatesToSettings.ts
 *
 * QiLing: QiLing uses its own updater mechanism (utils/updater.ts) and
 * doesn't store `autoUpdates` in the legacy globalConfig format.
 * This migration is a no-op stub — the relevant config key doesn't exist
 * in QiLing's Zod-validated settings schema.
 */

import { logForDebugging } from '../utils/log.js'

export function migrateAutoUpdatesToSettings(): void {
  // No-op: QiLing's settings schema uses DISABLE_AUTOUPDATER env var
  // directly without the intermediate globalConfig.autoUpdates field.
  logForDebugging('[migration] migrateAutoUpdatesToSettings: no-op (QL settings schema differs)')
}
