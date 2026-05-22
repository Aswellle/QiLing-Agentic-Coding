/**
 * Migration: clear skipAutoPermissionPrompt for users who accepted old dialog
 * Adapted from CC's migrations/resetAutoModeOptInForDefaultOffer.ts
 *
 * QiLing: Requires feature('TRANSCRIPT_CLASSIFIER') (ANT-internal bun-bundle
 * flag) and auto-mode infrastructure specific to CC's 1P subscription system.
 * QiLing's permission mode system does not use skipAutoPermissionPrompt.
 * No-op stub.
 */

import { logForDebugging } from '../utils/log.js'

export function resetAutoModeOptInForDefaultOffer(): void {
  logForDebugging('[migration] resetAutoModeOptInForDefaultOffer: no-op (ANT-internal feature flag)')
}
