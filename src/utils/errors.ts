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

/**
 * Thrown by provider when the primary model is overloaded and a fallback was used.
 * Matches CC's withRetry.ts FallbackTriggeredError pattern.
 * The query loop catches this to seamlessly switch to the fallback model.
 */
export class FallbackTriggeredError extends Error {
  constructor(
    public readonly originalModel: string,
    public readonly fallbackModel: string,
  ) {
    super(`Model overloaded: switching ${originalModel} → ${fallbackModel}`)
    this.name = 'FallbackTriggeredError'
  }
}

// FROM CC: ClaudeError
export class ClaudeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

// FROM CC: MalformedCommandError
export class MalformedCommandError extends Error {}

// FROM CC: ConfigParseError
export class ConfigParseError extends Error {
  filePath: string
  defaultConfig: unknown

  constructor(message: string, filePath: string, defaultConfig: unknown) {
    super(message)
    this.name = 'ConfigParseError'
    this.filePath = filePath
    this.defaultConfig = defaultConfig
  }
}

// FROM CC: ShellError
export class ShellError extends Error {
  constructor(
    public readonly stdout: string,
    public readonly stderr: string,
    public readonly code: number,
    public readonly interrupted: boolean,
  ) {
    super('Shell command failed')
    this.name = 'ShellError'
  }
}

// FROM CC: TeleportOperationError
export class TeleportOperationError extends Error {
  constructor(
    message: string,
    public readonly formattedMessage: string,
  ) {
    super(message)
    this.name = 'TeleportOperationError'
  }
}

// FROM CC: TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
export class TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS extends Error {
  readonly telemetryMessage: string

  constructor(message: string, telemetryMessage?: string) {
    super(message)
    this.name = 'TelemetrySafeError'
    this.telemetryMessage = telemetryMessage ?? message
  }
}

// FROM CC: AxiosErrorKind / classifyAxiosError
export type AxiosErrorKind =
  | 'auth'    // 401/403
  | 'timeout' // ECONNABORTED
  | 'network' // ECONNREFUSED/ENOTFOUND
  | 'http'    // other axios error (may have status)
  | 'other'   // not an axios error

export function classifyAxiosError(e: unknown): {
  kind: AxiosErrorKind
  status?: number
  message: string
} {
  const message = errorMessage(e)
  if (!e || typeof e !== 'object' || !('isAxiosError' in e) || !e.isAxiosError) {
    return { kind: 'other', message }
  }
  const err = e as { response?: { status?: number }; code?: string }
  const status = err.response?.status
  if (status === 401 || status === 403) return { kind: 'auth', status, message }
  if (err.code === 'ECONNABORTED') return { kind: 'timeout', status, message }
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return { kind: 'network', status, message }
  }
  return { kind: 'http', status, message }
}
