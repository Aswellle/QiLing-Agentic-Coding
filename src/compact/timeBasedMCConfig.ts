/**
 * Time-based microcompact configuration — adapted from CC's services/compact/timeBasedMCConfig.ts
 *
 * Controls content-clearing microcompact that triggers when the gap since the
 * last main-loop assistant message exceeds a threshold. When the server-side
 * prompt cache has likely expired, clearing old tool results before the API
 * call shrinks what gets rewritten.
 *
 * Runs BEFORE the API call (in microcompactMessages) so the shrunk prompt is
 * what actually gets sent. Running after the first cache miss only helps
 * subsequent turns.
 *
 * Main thread only — subagents have short lifetimes where gap-based eviction
 * doesn't apply.
 *
 * CC version reads from GrowthBook. QiLing reads from:
 * 1. QILING_TIME_BASED_MC_ENABLED env var (master switch)
 * 2. QILING_TIME_BASED_MC_GAP_MINUTES env var
 * 3. Defaults below
 */

export type TimeBasedMCConfig = {
  /** Master switch. When false, time-based microcompact is a no-op. */
  enabled: boolean
  /** Trigger when (now − last assistant timestamp) exceeds this many minutes.
   * 60 min = server's 1h cache TTL is guaranteed expired for all users. */
  gapThresholdMinutes: number
  /** Keep this many most-recent compactable tool results; older ones cleared. */
  keepRecent: number
}

const DEFAULT_CONFIG: TimeBasedMCConfig = {
  enabled: false,
  gapThresholdMinutes: 60,
  keepRecent: 5,
}

let _cachedConfig: TimeBasedMCConfig | undefined

export function getTimeBasedMCConfig(): TimeBasedMCConfig {
  if (_cachedConfig) return _cachedConfig

  const enabled = process.env.QILING_TIME_BASED_MC_ENABLED === '1'
  const gapStr = process.env.QILING_TIME_BASED_MC_GAP_MINUTES
  const gapThresholdMinutes = gapStr ? parseInt(gapStr, 10) : DEFAULT_CONFIG.gapThresholdMinutes

  _cachedConfig = {
    enabled,
    gapThresholdMinutes: isNaN(gapThresholdMinutes) ? DEFAULT_CONFIG.gapThresholdMinutes : gapThresholdMinutes,
    keepRecent: DEFAULT_CONFIG.keepRecent,
  }

  return _cachedConfig
}

/** @internal — for tests */
export function _resetTimeBasedMCConfigForTesting(): void {
  _cachedConfig = undefined
}
