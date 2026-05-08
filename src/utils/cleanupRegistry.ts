/**
 * Global cleanup registry for graceful shutdown — ported from CC's utils/cleanupRegistry.ts (verbatim)
 *
 * Usage:
 *   const unregister = registerCleanup(async () => { await closeConnections() })
 *   // Later: unregister()
 *
 *   process.on('exit', () => { runCleanupFunctions().catch(() => {}) })
 */

const cleanupFunctions = new Set<() => Promise<void>>()

export function registerCleanup(cleanupFn: () => Promise<void>): () => void {
  cleanupFunctions.add(cleanupFn)
  return () => cleanupFunctions.delete(cleanupFn)
}

export async function runCleanupFunctions(): Promise<void> {
  await Promise.all(Array.from(cleanupFunctions).map(fn => fn().catch(() => {})))
}
