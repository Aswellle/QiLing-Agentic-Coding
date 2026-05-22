/**
 * Migration: bypassPermissionsModeAccepted → skipDangerousModePermissionPrompt
 * Adapted from CC's migrations/migrateBypassPermissionsAcceptedToSettings.ts
 *
 * QiLing: QiLing does not use the `bypassPermissionsModeAccepted` config key.
 * Bypass-permissions acceptance is tracked via the active permission mode
 * state machine (modes/planMode.ts). This migration is a no-op stub.
 */

import { logForDebugging } from '../utils/log.js'

export function migrateBypassPermissionsAcceptedToSettings(): void {
  // No-op: QiLing uses permission mode state machine, not this config key.
  logForDebugging('[migration] migrateBypassPermissionsAcceptedToSettings: no-op (QL uses permission mode state machine)')
}
