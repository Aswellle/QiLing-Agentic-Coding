/**
 * Migration: claude-opus-4-0 / claude-opus-4-1 strings → 'opus' alias
 * Adapted from CC's migrations/migrateLegacyOpusToCurrent.ts
 *
 * QiLing: QiLing's model alias system (utils/modelAliases.ts) handles
 * old model string resolution at runtime. No settings migration needed.
 * This migration is a no-op stub.
 */

import { logForDebugging } from '../utils/log.js'

export function migrateLegacyOpusToCurrent(): void {
  // No-op: QiLing resolves legacy opus strings at runtime via modelAliases.ts
  logForDebugging('[migration] migrateLegacyOpusToCurrent: no-op (QL resolves aliases at runtime)')
}
