/**
 * Memoization utilities — ported from CC's utils/memoize.ts
 *
 * memoizeWithTTL(): stale-while-revalidate TTL cache (sync)
 * memoizeWithTTLAsync(): same, but for async functions (deduplicates in-flight cold misses)
 * memoizeWithLRU(): LRU cache with custom key function
 */

type CacheEntry<T> = { value: T; timestamp: number; refreshing: boolean }

/** Stale-while-revalidate memoization with TTL. */
export function memoizeWithTTL<Args extends unknown[], Result>(
  f: (...args: Args) => Result,
  cacheLifetimeMs = 5 * 60 * 1000,
): ((...args: Args) => Result) & { cache: { clear: () => void } } {
  const cache = new Map<string, CacheEntry<Result>>()

  const memoized = (...args: Args): Result => {
    const key = JSON.stringify(args)
    const cached = cache.get(key)
    const now = Date.now()

    if (!cached) {
      const value = f(...args)
      cache.set(key, { value, timestamp: now, refreshing: false })
      return value
    }

    if (now - cached.timestamp > cacheLifetimeMs && !cached.refreshing) {
      cached.refreshing = true
      Promise.resolve()
        .then(() => {
          const newValue = f(...args)
          if (cache.get(key) === cached) {
            cache.set(key, { value: newValue, timestamp: Date.now(), refreshing: false })
          }
        })
        .catch(() => {
          if (cache.get(key) === cached) cache.delete(key)
        })
    }

    return cached.value
  }

  memoized.cache = { clear: () => cache.clear() }
  return memoized
}

/**
 * Async stale-while-revalidate TTL memoization.
 * Deduplicates concurrent cold-miss calls via in-flight Map.
 * Ported from CC's utils/memoize.ts.
 */
export function memoizeWithTTLAsync<Args extends unknown[], Result>(
  f: (...args: Args) => Promise<Result>,
  cacheLifetimeMs = 5 * 60 * 1000,
): ((...args: Args) => Promise<Result>) & { cache: { clear: () => void } } {
  const cache = new Map<string, CacheEntry<Result>>()
  const inFlight = new Map<string, Promise<Result>>()

  const memoized = async (...args: Args): Promise<Result> => {
    const key = JSON.stringify(args)
    const cached = cache.get(key)
    const now = Date.now()

    if (!cached) {
      const pending = inFlight.get(key)
      if (pending) return pending
      const promise = f(...args)
      inFlight.set(key, promise)
      try {
        const result = await promise
        if (inFlight.get(key) === promise) {
          cache.set(key, { value: result, timestamp: now, refreshing: false })
        }
        return result
      } finally {
        if (inFlight.get(key) === promise) inFlight.delete(key)
      }
    }

    if (now - cached.timestamp > cacheLifetimeMs && !cached.refreshing) {
      const staleEntry = cached
      cached.refreshing = true
      f(...args)
        .then(newValue => {
          if (cache.get(key) === staleEntry) {
            cache.set(key, { value: newValue, timestamp: Date.now(), refreshing: false })
          }
        })
        .catch(() => {
          if (cache.get(key) === staleEntry) cache.delete(key)
        })
    }

    return cached.value
  }

  memoized.cache = {
    clear: () => { cache.clear(); inFlight.clear() },
  }
  return memoized as ((...args: Args) => Promise<Result>) & { cache: { clear: () => void } }
}

/** LRU memoization with custom key function and size limit. */
export function memoizeWithLRU<Args extends unknown[], Result>(
  f: (...args: Args) => Result,
  cacheFn: (...args: Args) => string,
  maxCacheSize = 100,
): ((...args: Args) => Result) & { cache: { clear: () => void; size: () => number; delete: (k: string) => boolean } } {
  // Simple LRU using Map (insertion order preserved; delete+re-insert on access)
  const cache = new Map<string, Result>()

  const memoized = (...args: Args): Result => {
    const key = cacheFn(...args)
    if (cache.has(key)) {
      const value = cache.get(key)!
      // Promote to most recently used
      cache.delete(key)
      cache.set(key, value)
      return value
    }
    const result = f(...args)
    if (cache.size >= maxCacheSize) {
      // Evict least recently used (first entry)
      cache.delete(cache.keys().next().value!)
    }
    cache.set(key, result)
    return result
  }

  memoized.cache = {
    clear: () => cache.clear(),
    size: () => cache.size,
    delete: (key: string) => cache.delete(key),
  }
  return memoized
}
