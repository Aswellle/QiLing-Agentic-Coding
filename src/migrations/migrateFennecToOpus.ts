/**
 * Migration: fennec-* model aliases → opus aliases (ANT-internal)
 * Adapted from CC's migrations/migrateFennecToOpus.ts
 *
 * QiLing: "Fennec" was an internal ANT codename. QiLing never shipped
 * with Fennec aliases in its model list. This migration is a no-op stub.
 */

import { logForDebugging } from '../utils/log.js'

export function migrateFennecToOpus(): void {
  // No-op: QiLing never used Fennec model aliases.
  logForDebugging('[migration] migrateFennecToOpus: no-op (no Fennec aliases in QiLing)')
}
