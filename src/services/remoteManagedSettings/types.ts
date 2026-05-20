/**
 * Remote managed settings types — adapted from CC's services/remoteManagedSettings/types.ts
 *
 * Zod schema for settings fetched from a remote policy server.
 * Uses permissive z.record() to avoid circular deps with SettingsSchema.
 */

import { z } from 'zod/v4'
import { lazySchema } from '../../utils/lazySchema.js'

export const RemoteManagedSettingsResponseSchema = lazySchema(() =>
  z.object({
    uuid: z.string(),
    checksum: z.string(),
    settings: z.record(z.string(), z.unknown()),
  }),
)

export type RemoteManagedSettingsResponse = z.infer<ReturnType<typeof RemoteManagedSettingsResponseSchema>>

export type RemoteManagedSettingsFetchResult = {
  success: boolean
  settings?: Record<string, unknown> | null
  checksum?: string
  error?: string
  skipRetry?: boolean
}
