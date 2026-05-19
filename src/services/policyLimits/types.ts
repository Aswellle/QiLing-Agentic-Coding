/**
 * Policy limits types — adapted from CC's services/policyLimits/types.ts
 *
 * Types for the organization policy restrictions API.
 * Policy restrictions are used to enforce organizational tool usage limits.
 */

import { z } from 'zod'
import { lazySchema } from '../../utils/lazySchema.js'

export const PolicyLimitsResponseSchema = lazySchema(() =>
  z.object({
    restrictions: z.record(z.string(), z.object({ allowed: z.boolean() })),
  }),
)

export type PolicyLimitsResponse = z.infer<ReturnType<typeof PolicyLimitsResponseSchema>>

export type PolicyLimitsFetchResult = {
  success: boolean
  restrictions?: PolicyLimitsResponse['restrictions'] | null
  etag?: string
  error?: string
  skipRetry?: boolean
}
