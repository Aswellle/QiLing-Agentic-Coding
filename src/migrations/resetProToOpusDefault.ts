/**
 * Migration: reset Pro users' default model to Opus alias
 * Adapted from CC's migrations/resetProToOpusDefault.ts
 *
 * QiLing: Requires firstParty provider + Pro subscription check, both
 * CC-specific constructs. QiLing supports multiple providers and does not
 * have the Pro/Max/Team subscription tiers. No-op stub.
 */

import { logForDebugging } from '../utils/log.js'

export function resetProToOpusDefault(): void {
  logForDebugging('[migration] resetProToOpusDefault: no-op (1P Pro subscription specific)')
}
