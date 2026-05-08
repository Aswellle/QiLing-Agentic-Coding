/**
 * Agent swarms (multi-agent teams) feature gate — ported from CC's utils/agentSwarmsEnabled.ts
 *
 * Enable via: QILING_AGENT_TEAMS=1 or --agent-teams CLI flag
 * QiLing always enables coordinator mode features without killswitch.
 */

export function isAgentSwarmsEnabled(): boolean {
  // Check env var
  if (process.env.QILING_AGENT_TEAMS === '1' ||
      process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === '1') {
    return true
  }
  // Check CLI flag
  if (process.argv.includes('--agent-teams') || process.argv.includes('--coordinator')) {
    return true
  }
  // Check coordinator mode
  if (process.env.QILING_COORDINATOR_MODE === '1') {
    return true
  }
  return false
}
