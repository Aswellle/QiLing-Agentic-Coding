export interface RetryOptions {
  maxRetries?: number
  baseDelay?: number    // ms，首次等待时间
  maxDelay?: number     // ms，最长等待上限
  signal?: AbortSignal
  onRetry?: (attempt: number, totalAttempts: number, error: string, delayMs: number) => void
}

// Errors that must pass through withRetry without retrying (checked by name, not message).
// FallbackTriggeredError: the provider already handled the overload by switching models;
// retrying with the same overloaded model is useless.
const NON_RETRY_ERROR_NAMES = new Set(['FallbackTriggeredError'])

// Errors that should be retried
const RETRYABLE_PATTERNS = [
  /429/,
  /rate.?limit/i,
  /529/,
  /overloaded/i,
  /503/,
  /service.?unavailable/i,
  /502/,
  /bad.?gateway/i,
  /econnreset/i,
  /econnrefused/i,
  /socket.?hang.?up/i,
  /network.?error/i,
  /timeout/i,
  /ETIMEDOUT/,
  /ENOTFOUND/,
]

// Errors that should NEVER be retried
const NON_RETRYABLE_PATTERNS = [
  /401/,
  /unauthorized/i,
  /403/,
  /forbidden/i,
  /404/,
  /not.?found/i,
  /400/,
  /bad.?request/i,
  /invalid.?api.?key/i,
]

export function isRetryable(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  if (NON_RETRYABLE_PATTERNS.some(p => p.test(msg))) return false
  return RETRYABLE_PATTERNS.some(p => p.test(msg))
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return }
    const timer = setTimeout(resolve, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Wraps an async function with exponential-backoff retry logic.
 *
 * 429/529 → retry up to maxRetries with exponential backoff (baseDelay * 2^n + jitter)
 * 503/network → same
 * 400/401/403/404 → fail immediately (non-retryable)
 * AbortSignal → stop retrying and throw AbortError
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1_000,
    maxDelay = 300_000, // 5 minutes
    signal,
    onRetry,
  } = options

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }

    try {
      return await fn(attempt)
    } catch (error) {
      lastError = error

      // Don't retry if aborted
      if (
        (error instanceof DOMException && error.name === 'AbortError') ||
        (error instanceof Error && error.message === 'Aborted')
      ) {
        throw error
      }

      // Don't retry sentinel errors that represent intentional control flow
      // (e.g. FallbackTriggeredError — the caller handles these directly)
      if (error instanceof Error && NON_RETRY_ERROR_NAMES.has(error.name)) {
        throw error
      }

      if (!isRetryable(error) || attempt >= maxRetries) {
        throw error
      }

      // Exponential backoff with ±10% jitter
      const base = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
      const jitter = base * 0.1 * (Math.random() * 2 - 1)
      const delayMs = Math.round(base + jitter)

      onRetry?.(attempt + 1, maxRetries, error instanceof Error ? error.message : String(error), delayMs)

      await sleep(delayMs, signal)
    }
  }

  throw lastError
}

/**
 * Extracts the HTTP status code from an error message.
 * Returns null if none found.
 */
export function extractStatusCode(error: unknown): number | null {
  const msg = error instanceof Error ? error.message : String(error)
  const m = msg.match(/\b(4\d{2}|5\d{2})\b/)
  return m ? parseInt(m[1], 10) : null
}
