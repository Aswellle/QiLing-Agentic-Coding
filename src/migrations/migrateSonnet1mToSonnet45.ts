/**
 * Migration: sonnet[1m] → sonnet-4-5-20250929[1m] (1P users)
 * Adapted from CC's migrations/migrateSonnet1mToSonnet45.ts
 *
 * QiLing: QiLing resolves model version strings at runtime via
 * utils/modelAliases.ts. No settings pin migration needed. No-op stub.
 */

import { logForDebugging } from '../utils/log.js'

export function migrateSonnet1mToSonnet45(): void {
  logForDebugging('[migration] migrateSonnet1mToSonnet45: no-op (QL resolves model aliases at runtime)')
}
