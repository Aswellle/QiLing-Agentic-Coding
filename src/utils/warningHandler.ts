/**
 * Node.js warning handler — adapted from CC's utils/warningHandler.ts
 *
 * Suppresses noisy internal Node.js warnings (MaxListenersExceededWarning etc.)
 * while still logging them in debug mode.
 */

export const MAX_WARNING_KEYS = 1000
const warningCounts = new Map<string, number>()

const INTERNAL_WARNINGS = [
  /MaxListenersExceededWarning.*AbortSignal/,
  /MaxListenersExceededWarning.*EventTarget/,
]

function isInternalWarning(warning: Error): boolean {
  const str = `${warning.name}: ${warning.message}`
  return INTERNAL_WARNINGS.some(p => p.test(str))
}

let _warningHandler: ((warning: Error) => void) | null = null

export function resetWarningHandler(): void {
  if (_warningHandler) process.removeListener('warning', _warningHandler)
  _warningHandler = null
  warningCounts.clear()
}

export function initializeWarningHandler(): void {
  const current = process.listeners('warning')
  if (_warningHandler && current.includes(_warningHandler)) return

  const isDev = process.env.NODE_ENV === 'development'
  if (!isDev) process.removeAllListeners('warning')

  _warningHandler = (warning: Error) => {
    try {
      const key = `${warning.name}: ${warning.message.slice(0, 50)}`
      const count = warningCounts.get(key) ?? 0
      if (warningCounts.has(key) || warningCounts.size < MAX_WARNING_KEYS) {
        warningCounts.set(key, count + 1)
      }

      const internal = isInternalWarning(warning)
      if (process.env.QILING_DEBUG === '1') {
        console.error(`[${internal ? 'internal ' : ''}warning]`, warning.toString())
      }
    } catch { /* fail silently */ }
  }

  process.on('warning', _warningHandler)
}
