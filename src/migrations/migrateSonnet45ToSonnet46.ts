/**
 * Migration: Sonnet 4.5 explicit strings → 'sonnet' alias (1P Pro/Max/Team)
 * Adapted from CC's migrations/migrateSonnet45ToSonnet46.ts
 *
 * QiLing: Requires firstParty provider + subscription check. QiLing supports
 * multiple providers and resolves model aliases at runtime. No-op stub.
 */

import { logForDebugging } from '../utils/log.js'

export function migrateSonnet45ToSonnet46(): void {
  logForDebugging('[migration] migrateSonnet45ToSonnet46: no-op (QL resolves model aliases at runtime)')
}
