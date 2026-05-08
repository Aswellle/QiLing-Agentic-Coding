/**
 * Promise.withResolvers() polyfill — ported from CC's utils/withResolvers.ts (verbatim)
 * Useful for creating externally-resolvable promises.
 */
export function withResolvers<T>(): PromiseWithResolvers<T> {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}
