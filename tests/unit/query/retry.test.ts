import { describe, test, expect } from 'bun:test'
import { withRetry, isRetryable } from '../../../src/retry/withRetry'

describe('isRetryable', () => {
  test('429 errors are retryable', () => {
    expect(isRetryable(new Error('429 Too Many Requests'))).toBe(true)
    expect(isRetryable(new Error('rate limit exceeded'))).toBe(true)
  })

  test('529 errors are retryable', () => {
    expect(isRetryable(new Error('529 Overloaded'))).toBe(true)
    expect(isRetryable(new Error('overloaded'))).toBe(true)
  })

  test('503 errors are retryable', () => {
    expect(isRetryable(new Error('503 Service Unavailable'))).toBe(true)
  })

  test('network errors are retryable', () => {
    expect(isRetryable(new Error('ECONNRESET'))).toBe(true)
    expect(isRetryable(new Error('socket hang up'))).toBe(true)
    expect(isRetryable(new Error('timeout'))).toBe(true)
  })

  test('401/403 are NOT retryable', () => {
    expect(isRetryable(new Error('401 Unauthorized'))).toBe(false)
    expect(isRetryable(new Error('403 Forbidden'))).toBe(false)
    expect(isRetryable(new Error('invalid api key'))).toBe(false)
  })

  test('400 bad request is NOT retryable', () => {
    expect(isRetryable(new Error('400 Bad Request'))).toBe(false)
  })

  test('404 not found is NOT retryable', () => {
    expect(isRetryable(new Error('404 Not Found'))).toBe(false)
  })
})

describe('withRetry — success cases', () => {
  test('succeeds on first attempt', async () => {
    let calls = 0
    const result = await withRetry(async () => { calls++; return 'ok' })
    expect(result).toBe('ok')
    expect(calls).toBe(1)
  })

  test('retries on retryable error and eventually succeeds', async () => {
    let calls = 0
    const result = await withRetry(async () => {
      calls++
      if (calls < 3) throw new Error('429 Rate limit')
      return 'success'
    }, { baseDelay: 1, maxRetries: 3 })

    expect(result).toBe('success')
    expect(calls).toBe(3)
  })
})

describe('withRetry — failure cases', () => {
  test('throws immediately on non-retryable error', async () => {
    let calls = 0
    await expect(
      withRetry(async () => { calls++; throw new Error('401 Unauthorized') }, { baseDelay: 1 })
    ).rejects.toThrow('401 Unauthorized')
    expect(calls).toBe(1)
  })

  test('throws after maxRetries exhausted', async () => {
    let calls = 0
    await expect(
      withRetry(async () => { calls++; throw new Error('503 Service Unavailable') }, {
        maxRetries: 2, baseDelay: 1
      })
    ).rejects.toThrow('503 Service Unavailable')
    expect(calls).toBe(3) // 1 initial + 2 retries
  })

  test('calls onRetry callback on each retry', async () => {
    const retryLogs: number[] = []
    await withRetry(
      async (attempt) => {
        if (attempt < 2) throw new Error('429 rate limit')
        return 'done'
      },
      {
        baseDelay: 1,
        maxRetries: 3,
        onRetry: (attempt) => retryLogs.push(attempt),
      }
    ).catch(() => {})

    expect(retryLogs.length).toBeGreaterThanOrEqual(1)
  })
})

describe('withRetry — AbortSignal', () => {
  test('stops retrying when signal is aborted', async () => {
    const ac = new AbortController()
    let calls = 0

    const promise = withRetry(
      async () => {
        calls++
        throw new Error('503 Service Unavailable')
      },
      { baseDelay: 100, maxRetries: 5, signal: ac.signal }
    )

    // Abort after first failure
    setTimeout(() => ac.abort(), 10)

    await expect(promise).rejects.toThrow()
    expect(calls).toBeLessThan(5)
  })
})
