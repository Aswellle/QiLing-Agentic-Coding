/**
 * Token budget management — ported from CC's query/tokenBudget.ts
 *
 * Tracks token usage across iterations and decides when to nudge the model
 * to wrap up before running out of context window.
 */

// CC constants (preserved verbatim)
const COMPLETION_THRESHOLD = 0.9     // 90% usage → force stop
const DIMINISHING_THRESHOLD = 500    // delta < 500 tokens = diminishing returns
const MAX_CONTINUATIONS = 3          // max nudges before stopping

export interface BudgetTracker {
  continuationCount: number
  lastDeltaTokens: number
  lastGlobalTurnTokens: number
  startedAt: number
}

export interface ContinueDecision {
  action: 'continue'
  pct: number
  nudgeMessage: string
}

export interface StopDecision {
  action: 'stop'
  completionEvent?: {
    reason: 'budget_complete' | 'diminishing_returns'
    pct: number
    continuations: number
  }
}

export type TokenBudgetDecision = ContinueDecision | StopDecision

export function createBudgetTracker(): BudgetTracker {
  return {
    continuationCount: 0,
    lastDeltaTokens: 0,
    lastGlobalTurnTokens: 0,
    startedAt: Date.now(),
  }
}

/**
 * Mirrors CC's checkTokenBudget() exactly:
 * - If > 90% budget used: stop
 * - If 3+ continuations with diminishing returns: stop
 * - Otherwise: nudge and continue
 */
export function checkTokenBudget(
  tracker: BudgetTracker,
  budget: number,
  turnTokens: number,
): TokenBudgetDecision {
  if (budget <= 0) return { action: 'stop' }

  const pct = Math.round((turnTokens / budget) * 100)
  const delta = turnTokens - tracker.lastGlobalTurnTokens

  // Diminishing returns: 3+ continuations with tiny deltas
  const isDiminishing =
    tracker.continuationCount >= MAX_CONTINUATIONS &&
    delta < DIMINISHING_THRESHOLD &&
    tracker.lastDeltaTokens < DIMINISHING_THRESHOLD

  if (isDiminishing || pct >= COMPLETION_THRESHOLD * 100) {
    return {
      action: 'stop',
      completionEvent: {
        reason: isDiminishing ? 'diminishing_returns' : 'budget_complete',
        pct,
        continuations: tracker.continuationCount,
      },
    }
  }

  // Still have budget — nudge model to wrap up
  tracker.continuationCount++
  tracker.lastDeltaTokens = delta
  tracker.lastGlobalTurnTokens = turnTokens

  const nudgeMessage =
    pct >= 80
      ? `You have used ${pct}% of your context window. Wrap up the current task concisely — avoid starting new long operations.`
      : `You have used ${pct}% of your context window.`

  return { action: 'continue', pct, nudgeMessage }
}
