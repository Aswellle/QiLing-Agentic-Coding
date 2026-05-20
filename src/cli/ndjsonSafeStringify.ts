/**
 * NDJSON-safe JSON serialization — adapted from CC's cli/ndjsonSafeStringify.ts
 *
 * Escapes U+2028 LINE SEPARATOR and U+2029 PARAGRAPH SEPARATOR to their
 * \uXXXX forms so the output can't be split by JS line-terminator parsers.
 * Safe for any JSON receiver; parses to the same value.
 */

import { jsonStringify } from '../utils/slowOperations.js'

// Using RegExp constructor to avoid U+2028/U+2029 being parsed as line terminators
const JS_LINE_TERMINATORS = new RegExp(' | ', 'g')

function escapeJsLineTerminators(json: string): string {
  return json.replace(JS_LINE_TERMINATORS, c => c === ' ' ? '\\u2028' : '\\u2029')
}

export function ndjsonSafeStringify(value: unknown): string {
  return escapeJsLineTerminators(jsonStringify(value))
}
