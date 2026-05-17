/**
 * Post-compact cleanup — ported from CC's services/compact/postCompactCleanup.ts
 *
 * Clears caches and tracking state after compaction so the next turn starts
 * with a clean slate. Call this after both auto-compact and manual /compact.
 *
 * QiLing adaptations vs CC original:
 *   - feature('CONTEXT_COLLAPSE') → always true (QiLing always runs contextCollapse)
 *   - feature('COMMIT_ATTRIBUTION') → omitted (CC-specific attribution hooks)
 *   - getUserContext.cache.clear() + resetGetMemoryFilesCache() → resetContextCaches()
 *   - clearSystemPromptSections() → omitted (CC-specific system prompt cache)
 *   - clearClassifierApprovals() → omitted (CC-specific classifier state)
 *   - clearSpeculativeChecks() → omitted (CC-specific speculative bash checks)
 *   - clearSessionMessagesCache() → omitted (CC-specific session storage)
 *   - clearBetaTracingState() → omitted (CC-specific telemetry)
 *   - resetMicrocompactState() → resetMicrocompactState() (QiLing's simple version)
 *
 * Sub-agent safety: subagents (querySource starting with 'agent:') run in the
 * same process and share module-level state with the main thread. Main-thread
 * module-level state (context caches) is only reset for main-thread compacts,
 * not subagent compacts, to avoid corrupting the main thread's state.
 */

import { resetContextCaches } from '../context'

// Module-level flag tracking last-assistant time used by microcompact.
// We import the reset function rather than the variable to avoid coupling.
let _microcompactStateResetFn: (() => void) | null = null

/**
 * Register the microcompact state reset function.
 * Called by engine.ts on module load to avoid a circular import.
 */
export function registerMicrocompactReset(fn: () => void): void {
  _microcompactStateResetFn = fn
}

/**
 * Reset microcompact tracking state after compaction.
 * Clears any cached state so the next request is treated fresh.
 */
function resetMicrocompactState(): void {
  _microcompactStateResetFn?.()
}

/**
 * Run cleanup of caches and tracking state after compaction.
 *
 * querySource: pass the compacting query's source to distinguish main-thread
 * compacts from subagent compacts. Subagents (querySource starting with 'agent:')
 * share module-level state with the main thread — skipping the main-thread resets
 * prevents corrupting the REPL's context caches mid-session.
 *
 * undefined / 'repl_main_thread*' / 'sdk' are treated as main-thread.
 */
export function runPostCompactCleanup(querySource?: string): void {
  // Same startsWith pattern as CC's isMainThread check (index.ts:188).
  const isMainThreadCompact =
    querySource === undefined ||
    querySource.startsWith('repl_main_thread') ||
    querySource === 'sdk'

  // Reset microcompact tracking state (safe for all callers — microcompact
  // state is per-message-set, not per-thread, so subagent resets are OK).
  resetMicrocompactState()

  // Context-collapse in QiLing is stateless (no collapse store — it's a pure
  // function over messages). Nothing to reset here, unlike CC's store-based impl.

  if (isMainThreadCompact) {
    // Reset getUserContext / getSystemContext / git status caches so the next
    // turn picks up fresh CLAUDE.md content and git state after compaction.
    // CC: getUserContext.cache.clear?.() + resetGetMemoryFilesCache('compact')
    resetContextCaches()
  }
}
