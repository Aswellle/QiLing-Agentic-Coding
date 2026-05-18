/**
 * Session fingerprint — direct port of CC's utils/fingerprint.ts
 *
 * Computes a 3-char hex fingerprint for request attribution.
 * Algorithm: SHA256(SALT + chars[4,7,20] + version)[:3]
 * Must match CC's algorithm exactly for 1P API attribution.
 */

import { createHash } from 'node:crypto'
import type { Message } from '../types/message'

export const FINGERPRINT_SALT = '59cf53e54c78'

/**
 * Extract text from the first user message in the conversation.
 */
export function extractFirstMessageText(messages: Message[]): string {
  const first = messages.find(m => m.role === 'user' && !(m as { isMeta?: boolean }).isMeta)
  if (!first) return ''
  if (typeof first.content === 'string') return first.content
  if (Array.isArray(first.content)) {
    const textBlock = first.content.find((b): b is { type: 'text'; text: string } => b.type === 'text')
    return textBlock?.text ?? ''
  }
  return ''
}

/**
 * Compute a 3-character hex fingerprint from message text and version.
 */
export function computeFingerprint(messageText: string, version: string): string {
  const chars = [4, 7, 20].map(i => messageText[i] ?? '0').join('')
  const input = `${FINGERPRINT_SALT}${chars}${version}`
  return createHash('sha256').update(input).digest('hex').slice(0, 3)
}

/**
 * Compute fingerprint from the conversation messages.
 */
export function computeFingerprintFromMessages(messages: Message[]): string {
  const text = extractFirstMessageText(messages)
  // Use package version as the version parameter
  let version = '0.0.0'
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    version = (require('../../package.json') as { version: string }).version
  } catch { /* ignore */ }
  return computeFingerprint(text, version)
}
