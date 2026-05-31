/**
 * Standalone agent utilities for sessions with custom names/colors.
 */

// FROM CC: getTeamName from utils/teammate.ts — stub (coordinator handles team context)
const getTeamName = (): string | undefined => undefined

type AppStateWithAgent = {
  standaloneAgentContext?: { name?: string; color?: string }
  [key: string]: unknown
}

/**
 * Returns the standalone agent name if set and not a swarm teammate.
 */
export function getStandaloneAgentName(
  appState: AppStateWithAgent,
): string | undefined {
  if (getTeamName()) {
    return undefined
  }
  return appState.standaloneAgentContext?.name
}
