/**
 * UUID utilities — ported from CC's utils/uuid.ts
 * Returns branded types: UUID (from crypto) and AgentId (from types/ids).
 */

import { randomBytes, type UUID } from 'crypto'
import type { AgentId } from '../types/ids'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Validate UUID format. Returns the string as UUID if valid, null otherwise. */
export function validateUuid(maybeUuid: unknown): UUID | null {
  if (typeof maybeUuid !== 'string') return null
  return UUID_RE.test(maybeUuid) ? (maybeUuid as UUID) : null
}

/**
 * Generate a new agent ID with optional label prefix.
 * Format: a{label-}{16 hex chars}. Example: aa3f2c1b4d5e6f7a8
 */
export function createAgentId(label?: string): AgentId {
  const suffix = randomBytes(8).toString('hex')
  return (label ? `a${label}-${suffix}` : `a${suffix}`) as AgentId
}
