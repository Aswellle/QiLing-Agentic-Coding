/**
 * Zero-initialized usage object — adapted from CC's services/api/emptyUsage.ts
 *
 * Extracted so modules can import it without pulling in the full
 * api/errors.ts → utils/messages.ts → Tool.ts → the world chain.
 *
 * CC's NonNullableUsage has many more fields (server_tool_use, cache_creation,
 * inference_geo, iterations, speed). QiLing uses the leaner TokenUsage.
 */

import type { TokenUsage } from '../../types/message.js'

export const EMPTY_USAGE: Readonly<TokenUsage> = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
} as const
