/**
 * Control message key normalization — direct port of CC's utils/controlMessageCompat.ts
 *
 * Normalizes camelCase `requestId` → snake_case `request_id` on incoming
 * control messages (control_request, control_response).
 *
 * Older iOS app builds send `requestId` due to a missing Swift CodingKeys
 * mapping. Without this shim, SDK control request detection rejects the
 * message and both message paths silently drop it.
 *
 * If both `request_id` and `requestId` are present, snake_case wins.
 * Mutates the object in place — returns the same reference.
 */

export function normalizeControlMessageKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj
  const record = obj as Record<string, unknown>

  if ('requestId' in record && !('request_id' in record)) {
    record.request_id = record.requestId
    delete record.requestId
  }

  if (
    'response' in record &&
    record.response !== null &&
    typeof record.response === 'object'
  ) {
    const response = record.response as Record<string, unknown>
    if ('requestId' in response && !('request_id' in response)) {
      response.request_id = response.requestId
      delete response.requestId
    }
  }

  return obj
}
