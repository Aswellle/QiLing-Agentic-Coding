// FROM CC: hooks/useAwaySummary.ts (adapt-new stub)
// Stripped: bun:bundle feature('AWAY_SUMMARY') gate (ANT-only), GrowthBook
// Feature is disabled in QiLing; hook is a no-op until Phase D.
import type { Message } from '../types/message.js'

type SetMessages = (updater: (prev: Message[]) => Message[]) => void

/**
 * Stub: appends a "while you were away" summary after 5min blur.
 * Disabled in QiLing (awaits Phase D / away-summary service port).
 */
export function useAwaySummary(
  _messages: readonly Message[],
  _setMessages: SetMessages,
  _isLoading: boolean,
): void {
  // No-op: feature('AWAY_SUMMARY') is ANT-only and not enabled in QiLing.
}
