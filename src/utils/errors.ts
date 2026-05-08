/**
 * Error utilities — ported from CC's utils/errors.ts (core portable subset)
 *
 * toError(), errorMessage(), getErrnoCode(), isENOENT(), getErrnoPath(),
 * shortErrorStack(), hasExactErrorMessage()
 */

export class AbortError extends Error {
  constructor(message = 'Aborted') {
    super(message)
    this.name = 'AbortError'
  }
}

export function isAbortError(e: unknown): boolean {
  return e instanceof AbortError ||
    (e instanceof DOMException && e.name === 'AbortError') ||
    (e instanceof Error && (e.message === 'Aborted' || e.name === 'AbortError'))
}

export function hasExactErrorMessage(error: unknown, message: string): boolean {
  return error instanceof Error && error.message === message
}

/** Normalize an unknown value into an Error. */
export function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e))
}

/** Extract a string message from an unknown error-like value. */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** Extract the errno code (e.g., 'ENOENT', 'EACCES') from a caught error. */
export function getErrnoCode(e: unknown): string | undefined {
  if (e && typeof e === 'object' && 'code' in e && typeof e.code === 'string') return e.code
  return undefined
}

/** True if the error is ENOENT (file or directory does not exist). */
export function isENOENT(e: unknown): boolean {
  return getErrnoCode(e) === 'ENOENT'
}

/** Extract the errno path from a caught error. */
export function getErrnoPath(e: unknown): string | undefined {
  if (e && typeof e === 'object' && 'path' in e && typeof e.path === 'string') return e.path
  return undefined
}

/**
 * Extract error message + top N stack frames (for tool results).
 * Full stacks waste context tokens — keep them for debug logs only.
 */
export function shortErrorStack(e: unknown, maxFrames = 5): string {
  if (!(e instanceof Error)) return String(e)
  if (!e.stack) return e.message
  const lines = e.stack.split('\n')
  const header = lines[0] ?? e.message
  const frames = lines.slice(1).filter(l => l.trim().startsWith('at '))
  if (frames.length <= maxFrames) return e.stack
  return [header, ...frames.slice(0, maxFrames)].join('\n')
}

/** True if error code indicates filesystem inaccessibility (ENOENT, EACCES, EPERM, etc.) */
export function isFsInaccessible(e: unknown): boolean {
  const code = getErrnoCode(e)
  return ['ENOENT', 'EACCES', 'EPERM', 'ENOTDIR', 'ELOOP'].includes(code ?? '')
}
