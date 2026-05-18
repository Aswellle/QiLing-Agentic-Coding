/**
 * NDJSON-safe JSON serialization — direct port of CC's cli/ndjsonSafeStringify.ts
 *
 * JSON.stringify emits U+2028/U+2029 raw (valid per ECMA-404). These
 * characters are line terminators in ECMA-262 §11.3. Any receiver that
 * uses JavaScript line-terminator semantics to split the NDJSON stream
 * will cut JSON mid-string, silently dropping the message.
 *
 * \uXXXX escapes are equivalent JSON (parses to same string) but can
 * never be mistaken for line terminators by any receiver. Same approach
 * used by ES2019 "Subsume JSON" proposal and Node.js util.inspect.
 */

import { jsonStringify } from './slowOperations.js'

// Must use RegExp constructor — U+2028/U+2029 are JS line terminators and
// cannot appear as literals inside a regex literal without causing parse errors.
const JS_LINE_TERMINATORS = new RegExp(' | ', 'g')

function escapeJsLineTerminators(json: string): string {
  return json.replace(JS_LINE_TERMINATORS, (c: string) =>
    c === ' ' ? '\\u2028' : '\\u2029',
  )
}

/**
 * JSON.stringify for one-message-per-line (NDJSON) transports.
 * Escapes U+2028 LINE SEPARATOR and U+2029 PARAGRAPH SEPARATOR so the
 * output cannot be broken by a line-splitting receiver.
 * Output is valid JSON and parses to the same value as JSON.stringify.
 */
export function ndjsonSafeStringify(value: unknown): string {
  return escapeJsLineTerminators(jsonStringify(value))
}
