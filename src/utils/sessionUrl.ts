/**
 * Session URL / identifier parsing — adapted from CC's utils/sessionUrl.ts
 *
 * Parses a session resume identifier which can be:
 * - A JSONL file path (ends with .jsonl)
 * - A plain UUID (session ID)
 * - An ingress URL (https://api.../session/UUID)
 *
 * Windows note: Windows absolute paths like C:\path\file.jsonl are valid URLs
 * with C: as protocol — check for .jsonl extension BEFORE URL parsing.
 */

import { randomUUID } from 'node:crypto'
import type { UUID } from 'node:crypto'
import { validateUuid } from './uuid.js'

export type ParsedSessionUrl = {
  sessionId: UUID
  ingressUrl: string | null
  isUrl: boolean
  jsonlFile: string | null
  isJsonlFile: boolean
}

/**
 * Parse a session resume identifier into its components.
 * Returns null if the identifier is not a valid UUID, URL, or .jsonl path.
 */
export function parseSessionIdentifier(
  resumeIdentifier: string,
): ParsedSessionUrl | null {
  // Check .jsonl before URL parsing — Windows paths are misidentified as URLs
  if (resumeIdentifier.toLowerCase().endsWith('.jsonl')) {
    return {
      sessionId: randomUUID() as UUID,
      ingressUrl: null,
      isUrl: false,
      jsonlFile: resumeIdentifier,
      isJsonlFile: true,
    }
  }

  // Plain UUID
  if (validateUuid(resumeIdentifier)) {
    return {
      sessionId: resumeIdentifier as UUID,
      ingressUrl: null,
      isUrl: false,
      jsonlFile: null,
      isJsonlFile: false,
    }
  }

  // URL containing session ID
  try {
    const url = new URL(resumeIdentifier)
    return {
      sessionId: randomUUID() as UUID,
      ingressUrl: url.href,
      isUrl: true,
      jsonlFile: null,
      isJsonlFile: false,
    }
  } catch {
    // Not a valid URL
  }

  return null
}
