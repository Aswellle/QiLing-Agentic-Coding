// FROM CC: services/oauth/types.ts (type stubs for config.ts)
// BillingType and ReferralEligibilityResponse are CC OAuth-specific types
export type BillingType = 'console' | 'claude_ai' | 'unknown'

export type ReferralEligibilityResponse = {
  eligible: boolean
  reason?: string
}
