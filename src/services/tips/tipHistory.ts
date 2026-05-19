/**
 * Tip display history — adapted from CC's services/tips/tipHistory.ts
 *
 * Tracks which tips have been shown and when (by startup count).
 * Uses in-memory storage since QiLing doesn't have a config.numStartups system.
 * Tips rotate based on time since last shown.
 *
 * CC: stores in global config (persistent across restarts via numStartups count)
 * QiLing: in-memory per-session (simpler, no startup counter needed)
 */

// Map from tip ID → session timestamp when last shown
const _tipHistory = new Map<string, number>()
let _sessionStartMs = Date.now()
const SESSION_MS = 30_000  // treat "shown this session" as 30s window

/** Record that a tip was shown. */
export function recordTipShown(tipId: string): void {
  _tipHistory.set(tipId, Date.now())
}

/** Get seconds since this tip was last shown (Infinity if never shown). */
export function getSecondsSinceLastShown(tipId: string): number {
  const lastShown = _tipHistory.get(tipId)
  if (!lastShown) return Infinity
  return (Date.now() - lastShown) / 1000
}

/** Get minutes since this tip was last shown (Infinity if never shown). */
export function getMinutesSinceLastShown(tipId: string): number {
  return getSecondsSinceLastShown(tipId) / 60
}

/** True if this tip was shown in the current session window. */
export function wasShownThisSession(tipId: string): boolean {
  const lastShown = _tipHistory.get(tipId)
  if (!lastShown) return false
  return lastShown >= _sessionStartMs
}

/** @internal — for tests */
export function _resetTipHistoryForTesting(): void {
  _tipHistory.clear()
  _sessionStartMs = Date.now()
}
