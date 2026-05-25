// FROM CC: tools/FileReadTool/limits.ts
import { MAX_OUTPUT_SIZE } from '../../utils/file.js'

export const DEFAULT_MAX_OUTPUT_TOKENS = 25000

/**
 * Env var override for max output tokens. Returns undefined when unset/invalid.
 */
function getEnvMaxTokens(): number | undefined {
  const override = process.env.CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS
  if (override) {
    const parsed = parseInt(override, 10)
    if (!isNaN(parsed) && parsed > 0) return parsed
  }
  return undefined
}

export type FileReadingLimits = {
  maxTokens: number
  maxSizeBytes: number
  includeMaxSizeInPrompt?: boolean
  targetedRangeNudge?: boolean
}

/**
 * Default limits for Read tool. Env var beats hardcoded default.
 * No GrowthBook: QiLing uses a fixed default; override via env var.
 */
export function getDefaultFileReadingLimits(): FileReadingLimits {
  return {
    maxSizeBytes: MAX_OUTPUT_SIZE,
    maxTokens: getEnvMaxTokens() ?? DEFAULT_MAX_OUTPUT_TOKENS,
  }
}
