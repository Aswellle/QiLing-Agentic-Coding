/**
 * Deterministic Agent ID System — direct port of CC's utils/agentId.ts
 *
 * Agent IDs: `agentName@teamName`  (e.g., `researcher@my-project`)
 * Request IDs: `{type}-{timestamp}@{agentId}`  (e.g., `shutdown-1702500000000@researcher@my-project`)
 *
 * Deterministic IDs are human-readable, reproducible across crashes/restarts,
 * and predictable so coordinators can compute teammate IDs without a lookup.
 *
 * Constraint: agent names must NOT contain `@` — use sanitizeAgentName() to strip.
 */

export function formatAgentId(agentName: string, teamName: string): string {
  return `${agentName}@${teamName}`
}

export function parseAgentId(
  agentId: string,
): { agentName: string; teamName: string } | null {
  const atIndex = agentId.indexOf('@')
  if (atIndex === -1) return null
  return {
    agentName: agentId.slice(0, atIndex),
    teamName: agentId.slice(atIndex + 1),
  }
}

export function generateRequestId(requestType: string, agentId: string): string {
  return `${requestType}-${Date.now()}@${agentId}`
}

export function parseRequestId(
  requestId: string,
): { requestType: string; timestamp: number; agentId: string } | null {
  const atIndex = requestId.indexOf('@')
  if (atIndex === -1) return null

  const prefix = requestId.slice(0, atIndex)
  const agentId = requestId.slice(atIndex + 1)
  const lastDash = prefix.lastIndexOf('-')
  if (lastDash === -1) return null

  const requestType = prefix.slice(0, lastDash)
  const timestamp = parseInt(prefix.slice(lastDash + 1), 10)
  if (isNaN(timestamp)) return null

  return { requestType, timestamp, agentId }
}
