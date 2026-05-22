/**
 * Migration: opus → opus[1m] for eligible 1P Max/Team Premium users
 * Adapted from CC's migrations/migrateOpusToOpus1m.ts
 *
 * QiLing: This migration targets CC's first-party subscription tiers
 * (Max/Team Premium) and requires the `isOpus1mMergeEnabled` feature flag.
 * QiLing handles model aliases via utils/modelAliases.ts at runtime.
 * No-op stub.
 */

import { logForDebugging } from '../utils/log.js'

export function migrateOpusToOpus1m(): void {
  logForDebugging('[migration] migrateOpusToOpus1m: no-op (QL resolves model aliases at runtime)')
}
