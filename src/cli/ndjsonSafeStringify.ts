import { jsonStringify } from '../utils/slowOperations.js'

// JSON.stringify emits U+2028/U+2029 raw (valid per ECMA-404). NDJSON receivers
// using JS line-terminator semantics would split the stream mid-string.
// The \uXXXX form is equivalent JSON but can never be mistaken for a line terminator.
const JS_LINE_TERMINATORS = /\u2028|\u2029/g

function escapeJsLineTerminators(json: string): string {
  return json.replace(JS_LINE_TERMINATORS, c =>
    c === '\u2028' ? '\\u2028' : '\\u2029',
  )
}

/**
 * JSON.stringify for one-message-per-line transports. Escapes U+2028
 * LINE SEPARATOR and U+2029 PARAGRAPH SEPARATOR so the serialized output
 * cannot be broken by a line-splitting receiver.
 */
export function ndjsonSafeStringify(value: unknown): string {
  return escapeJsLineTerminators(jsonStringify(value))
}
