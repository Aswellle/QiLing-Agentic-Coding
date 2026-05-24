/**
 * Tool error formatting utilities — ported from CC's utils/toolErrors.ts
 *
 * formatError(): format any error value for display to user/AI
 * formatZodValidationError(): human-readable Zod validation errors for tool inputs
 */

import type { ZodError } from 'zod'
import { AbortError, ShellError } from './errors.js'
import { INTERRUPT_MESSAGE_FOR_TOOL_USE } from './messages.js'

const MAX_ERROR_LENGTH = 10_000
const HALF_LENGTH = 5_000

// FROM CC: getErrorParts — decompose an error into display parts (exit code, stderr, stdout)
export function getErrorParts(error: Error): string[] {
  if (error instanceof ShellError) {
    return [
      `Exit code ${error.code}`,
      error.interrupted ? INTERRUPT_MESSAGE_FOR_TOOL_USE : '',
      error.stderr,
      error.stdout,
    ]
  }
  const parts = [error.message]
  if ('stderr' in error && typeof error.stderr === 'string') parts.push(error.stderr)
  if ('stdout' in error && typeof error.stdout === 'string') parts.push(error.stdout)
  return parts
}

export function formatError(error: unknown): string {
  // FROM CC: AbortError is displayed with its own message (interrupt flow)
  if (error instanceof AbortError) return error.message || INTERRUPT_MESSAGE_FOR_TOOL_USE
  if (!(error instanceof Error)) return String(error)
  const fullMessage = getErrorParts(error).filter(Boolean).join('\n').trim() || 'Command failed with no output'
  if (fullMessage.length <= MAX_ERROR_LENGTH) return fullMessage
  return `${fullMessage.slice(0, HALF_LENGTH)}\n\n... [${fullMessage.length - MAX_ERROR_LENGTH} characters truncated] ...\n\n${fullMessage.slice(-HALF_LENGTH)}`
}

function formatValidationPath(path: (string | number)[]): string {
  return path.map(p => (typeof p === 'number' ? `[${p}]` : p)).join('.')
}

/**
 * Convert a ZodError to a human-readable tool validation error message.
 * Ported from CC's utils/toolErrors.ts.
 */
export function formatZodValidationError(toolName: string, error: ZodError): string {
  const missingParams = error.issues
    .filter(err => err.code === 'invalid_type' && err.message.includes('received undefined'))
    .map(err => formatValidationPath(err.path))

  const unexpectedParams = error.issues
    .filter(err => err.code === 'unrecognized_keys')
    .flatMap(err => (err as { keys: string[] }).keys ?? [])

  const typeMismatchParams = error.issues
    .filter(err => err.code === 'invalid_type' && !err.message.includes('received undefined'))
    .map(err => ({
      param: formatValidationPath(err.path),
      expected: (err as { expected: string }).expected,
      received: (err as { received: string }).received,
    }))

  let errorContent = error.message
  const errorParts: string[] = []

  if (missingParams.length > 0) {
    errorParts.push(...missingParams.map(p => `The required parameter \`${p}\` is missing`))
  }
  if (unexpectedParams.length > 0) {
    errorParts.push(...unexpectedParams.map(p => `An unexpected parameter \`${p}\` was provided`))
  }
  if (typeMismatchParams.length > 0) {
    errorParts.push(...typeMismatchParams.map(({ param, expected, received }) =>
      `The parameter \`${param}\` type is expected as \`${expected}\` but provided as \`${received}\``
    ))
  }

  if (errorParts.length > 0) {
    errorContent = `${toolName} failed due to the following ${errorParts.length > 1 ? 'issues' : 'issue'}:\n${errorParts.join('\n')}`
  }

  return errorContent
}
