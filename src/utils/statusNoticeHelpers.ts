/**
 * Status notice helpers — adapted from CC's utils/statusNoticeHelpers.ts
 *
 * Utilities for the status bar: agent description token estimates.
 * Used to decide whether agent descriptions are too long to include in prompts.
 */

import { roughTokenCountEstimation } from '../services/tokenEstimation.js'
import type { AgentDefinition } from '../tools/AgentTool/loadAgentsDir.js'

export const AGENT_DESCRIPTIONS_THRESHOLD = 15_000

type AgentDefinitionsResult = {
  activeAgents: AgentDefinition[]
}

/**
 * Calculate cumulative token estimate for all non-built-in agent descriptions.
 * Used to decide whether to include agent descriptions in system prompts.
 */
export function getAgentDescriptionsTotalTokens(
  agentDefinitions?: AgentDefinitionsResult,
): number {
  if (!agentDefinitions) return 0

  return agentDefinitions.activeAgents
    .filter(a => a.source !== 'built-in')
    .reduce((total, agent) => {
      const description = `${agent.agentType}: ${agent.whenToUse}`
      return total + roughTokenCountEstimation(description)
    }, 0)
}
