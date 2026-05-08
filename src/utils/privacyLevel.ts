/**
 * Privacy level controls — ported from CC's utils/privacyLevel.ts (adapted)
 *
 * Levels: default < no-telemetry < essential-traffic
 * Env vars: QILING_DISABLE_NONESSENTIAL_TRAFFIC → essential-traffic
 *           DISABLE_TELEMETRY → no-telemetry
 */

type PrivacyLevel = 'default' | 'no-telemetry' | 'essential-traffic'

export function getPrivacyLevel(): PrivacyLevel {
  if (process.env.QILING_DISABLE_NONESSENTIAL_TRAFFIC || process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC) {
    return 'essential-traffic'
  }
  if (process.env.DISABLE_TELEMETRY) return 'no-telemetry'
  return 'default'
}

export function isNonessentialTrafficEnabled(): boolean {
  return getPrivacyLevel() === 'default'
}

export function isTelemetryEnabled(): boolean {
  return getPrivacyLevel() !== 'essential-traffic'
}

// CC-compatible aliases
export function isEssentialTrafficOnly(): boolean {
  return getPrivacyLevel() === 'essential-traffic'
}

export function isTelemetryDisabled(): boolean {
  return getPrivacyLevel() !== 'default'
}

export function getEssentialTrafficOnlyReason(): string | null {
  if (process.env.QILING_DISABLE_NONESSENTIAL_TRAFFIC) {
    return 'QILING_DISABLE_NONESSENTIAL_TRAFFIC'
  }
  if (process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC) {
    return 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC'
  }
  return null
}
