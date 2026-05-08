/**
 * Tool error formatting utilities — ported from CC's utils/toolErrors.ts
 *
 * formatError(): format any error value for display to user/AI
 * formatZodValidationError(): human-readable Zod validation errors for tool inputs
 */

import type { ZodError } from 'zod'

const MAX_ERROR_LENGTH = 10_000
const HALF_LENGTH = 5_000

export function formatError(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  const msg = error.message?.trim() || 'Command failed with no output'
  if (msg.length <= MAX_ERROR_LENGTH) return msg
  return `${msg.slice(0, HALF_LENGTH)}\n\n... [${msg.length - MAX_ERROR_LENGTH} characters truncated] ...\n\n${msg.slice(-HALF_LENGTH)}`
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
