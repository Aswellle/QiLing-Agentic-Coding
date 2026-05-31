// FROM CC: SystemMemorySavedMessage from types/message.ts — inline type
type SystemMemorySavedMessage = {
  teamCount?: number
  [key: string]: unknown
}

/**
 * Returns the team-memory segment for the memory-saved UI, plus the count so
 * the caller can derive the private count without accessing teamCount itself.
 */
export function teamMemSavedPart(
  message: SystemMemorySavedMessage,
): { segment: string; count: number } | null {
  const count = message.teamCount ?? 0
  if (count === 0) return null
  return {
    segment: `${count} team ${count === 1 ? 'memory' : 'memories'}`,
    count,
  }
}
