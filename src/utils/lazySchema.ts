/**
 * Lazy schema factory — ported from CC's utils/lazySchema.ts (verbatim)
 *
 * Defers Zod schema construction from module init time to first access.
 * Important for startup performance — Zod schema construction is expensive.
 */
export function lazySchema<T>(factory: () => T): () => T {
  let cached: T | undefined
  return () => (cached ??= factory())
}
