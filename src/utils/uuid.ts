/**
 * UUID utilities — ported from CC's utils/uuid.ts (core subset)
 *
 * - validateUuid(): check if string is a valid UUID
 * - createAgentId(): generate prefixed agent ID
 */

import { randomBytes } from 'crypto'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Validate UUID format. Returns the string as UUID if valid, null otherwise. */
export function validateUuid(maybeUuid: unknown): string | null {
  if (typeof maybeUuid !== 'string') return null
  return UUID_RE.test(maybeUuid) ? maybeUuid : null
}

/**
 * Generate a new agent ID with prefix.
 * Format: a{label-}{16 hex chars}
 * Example: aa3f2c1b4d5e6f7a8, acompact-a3f2c1b4d5e6f7a8
 * Mirrors CC's createAgentId() from utils/uuid.ts.
 */
export function createAgentId(label?: string): string {
  const suffix = randomBytes(8).toString('hex')
  return label ? `a${label}-${suffix}` : `a${suffix}`
}
