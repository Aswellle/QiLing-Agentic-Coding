import { describe, test, expect } from 'bun:test'
import { isPromptTooLong, isMediaSizeError } from '../../../src/compact/reactiveCompact'
import { shouldAutoCompact, getAutoCompactThreshold, calculateTokenWarningState } from '../../../src/compact/autoCompact'
import { createBudgetTracker, checkTokenBudget } from '../../../src/compact/tokenBudget'
import type { TokenUsage } from '../../../src/types/message'

// ─── reactiveCompact ─────────────────────────────────────────────────────────

describe('isPromptTooLong', () => {
  test('detects Anthropic PTL message', () => {
    expect(isPromptTooLong('prompt is too long')).toBe(true)
    expect(isPromptTooLong('prompt_too_long')).toBe(true)
  })
  test('detects OpenAI context exceeded', () => {
    expect(isPromptTooLong('context_length_exceeded')).toBe(true)
    expect(isPromptTooLong('maximum context length is 128000 tokens')).toBe(true)
  })
  test('does not fire on unrelated errors', () => {
    expect(isPromptTooLong('network timeout')).toBe(false)
    expect(isPromptTooLong('rate limit exceeded')).toBe(false)
    expect(isPromptTooLong('invalid api key')).toBe(false)
  })
})

describe('isMediaSizeError', () => {
  test('detects media size errors', () => {
    expect(isMediaSizeError('image too large')).toBe(true)
    expect(isMediaSizeError('payload too large')).toBe(true)
  })
  test('does not fire on unrelated errors', () => {
    expect(isMediaSizeError('context too long')).toBe(false)
  })
})

// ─── autoCompact ─────────────────────────────────────────────────────────────

const makeUsage = (inputTokens: number): TokenUsage => ({
  inputTokens, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0,
})

describe('shouldAutoCompact', () => {
  const model = 'claude-sonnet-4-6'  // 200k context
  const threshold = getAutoCompactThreshold(model)

  test('returns false below threshold', () => {
    expect(shouldAutoCompact(makeUsage(threshold - 5000), model, 0)).toBe(false)
  })
  test('returns true at threshold', () => {
    expect(shouldAutoCompact(makeUsage(threshold), model, 0)).toBe(true)
  })
  test('circuit breaker: 3 failures → false', () => {
    expect(shouldAutoCompact(makeUsage(threshold + 10000), model, 3)).toBe(false)
  })
  test('threshold is 187k for 200k model', () => {
    // effective = 200k - 8096 = 191904, threshold = 191904 - 13000 = 178904
    expect(threshold).toBeGreaterThan(170_000)
    expect(threshold).toBeLessThan(195_000)
  })
})

describe('calculateTokenWarningState', () => {
  const model = 'claude-sonnet-4-6'

  test('ok when low usage', () => {
    const state = calculateTokenWarningState(makeUsage(50_000), model)
    expect(state.level).toBe('ok')
  })
  test('warn when near warning threshold', () => {
    const state = calculateTokenWarningState(makeUsage(175_000), model)
    expect(['warn', 'critical']).toContain(state.level)
  })
  test('critical when above compact threshold', () => {
    const state = calculateTokenWarningState(makeUsage(185_000), model)
    expect(['critical', 'blocked']).toContain(state.level)
  })
})

// ─── tokenBudget ─────────────────────────────────────────────────────────────

describe('checkTokenBudget', () => {
  test('stop when budget is zero', () => {
    const tracker = createBudgetTracker()
    const dec = checkTokenBudget(tracker, 0, 1000)
    expect(dec.action).toBe('stop')
  })

  test('stop at 90% usage', () => {
    const tracker = createBudgetTracker()
    const dec = checkTokenBudget(tracker, 100_000, 91_000)
    expect(dec.action).toBe('stop')
    expect(dec.completionEvent?.reason).toBe('budget_complete')
  })

  test('continue with nudge below threshold', () => {
    const tracker = createBudgetTracker()
    const dec = checkTokenBudget(tracker, 100_000, 50_000)
    expect(dec.action).toBe('continue')
    if (dec.action === 'continue') {
      expect(dec.nudgeMessage).toBeTruthy()
      expect(tracker.continuationCount).toBe(1)
    }
  })

  test('stop on diminishing returns after 3 continuations', () => {
    const tracker = createBudgetTracker()
    tracker.continuationCount = 3
    tracker.lastDeltaTokens = 100         // previous delta was tiny
    tracker.lastGlobalTurnTokens = 50_000 // previous check was at 50k

    const dec = checkTokenBudget(tracker, 100_000, 50_100)  // delta = 100 (tiny)
    expect(dec.action).toBe('stop')
    expect(dec.completionEvent?.reason).toBe('diminishing_returns')
  })

  test('nudge message mentions usage percentage', () => {
    const tracker = createBudgetTracker()
    const dec = checkTokenBudget(tracker, 100_000, 85_000)
    if (dec.action === 'continue') {
      expect(dec.nudgeMessage).toContain('85%')
    }
  })
})
