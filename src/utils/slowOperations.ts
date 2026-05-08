/**
 * Slow operation wrappers — ported from CC's utils/slowOperations.ts (core subset)
 *
 * jsonStringify(): JSON.stringify with performance logging in debug mode
 * jsonParse(): JSON.parse with performance logging in debug mode
 * cloneDeep(): deep clone using structuredClone (faster than lodash)
 */

const SLOW_THRESHOLD_MS = parseInt(process.env.QILING_SLOW_OP_THRESHOLD_MS ?? '', 10) || 300

function logSlow(op: string, ms: number): void {
  if (process.env.QILING_DEBUG === '1' && ms > SLOW_THRESHOLD_MS) {
    process.stderr.write(`[slow:${op}] ${ms.toFixed(1)}ms\n`)
  }
}

/** JSON.stringify with optional slow-op logging. */
export function jsonStringify(value: unknown, replacer?: unknown, space?: string | number): string {
  const t0 = Date.now()
  const result = JSON.stringify(value, replacer as Parameters<typeof JSON.stringify>[1], space)
  logSlow('jsonStringify', Date.now() - t0)
  return result
}

/** JSON.parse with optional slow-op logging. */
export const jsonParse: typeof JSON.parse = (text, reviver) => {
  const t0 = Date.now()
  const result = JSON.parse(text, reviver)
  logSlow('jsonParse', Date.now() - t0)
  return result
}

/** Deep clone using structuredClone (fast) or JSON round-trip (fallback). */
export function cloneDeep<T>(value: T): T {
  if (typeof structuredClone !== 'undefined') return structuredClone(value)
  return JSON.parse(JSON.stringify(value)) as T
}
