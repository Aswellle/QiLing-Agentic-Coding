/**
 * Shared utilities for displaying agent information.
 * Used by both the CLI `qiling agents` handler and the interactive `/agents` command.
 *
 * Ported from CC's AgentTool/agentDisplay.ts
 */

import type { AgentDefinition } from './loadAgentsDir'

// AgentSource mirrors the union used in loadAgentsDir + extra display-only values
type AgentSource =
  | 'userSettings'
  | 'projectSettings'
  | 'localSettings'
  | 'policySettings'
  | 'flagSettings'
  | 'built-in'
  | 'plugin'
  | 'project'
  | 'user'

export type AgentSourceGroup = {
  label: string
  source: AgentSource
}

/**
 * Ordered list of agent source groups for display.
 * Both the CLI and interactive UI should use this to ensure consistent ordering.
 */
export const AGENT_SOURCE_GROUPS: AgentSourceGroup[] = [
  { label: 'User agents', source: 'user' },
  { label: 'Project agents', source: 'project' },
  { label: 'Plugin agents', source: 'plugin' },
  { label: 'Built-in agents', source: 'built-in' },
]

export type ResolvedAgent = AgentDefinition & {
  overriddenBy?: AgentSource
}

/**
 * Annotate agents with override information by comparing against the active
 * (winning) agent list. An agent is "overridden" when another agent with the
 * same type from a higher-priority source takes precedence.
 *
 * Also deduplicates by (agentType, source) to handle git worktree duplicates
 * where the same agent file is loaded from both the worktree and main repo.
 */
export function resolveAgentOverrides(
  allAgents: AgentDefinition[],
  activeAgents: AgentDefinition[],
): ResolvedAgent[] {
  const activeMap = new Map<string, AgentDefinition>()
  for (const agent of activeAgents) {
    activeMap.set(agent.agentType, agent)
  }

  const seen = new Set<string>()
  const resolved: ResolvedAgent[] = []

  // Iterate allAgents, annotating each with override info from activeAgents.
  // Deduplicate by (agentType, source) to handle git worktree duplicates.
  for (const agent of allAgents) {
    const agentSource = 'source' in agent ? (agent as AgentDefinition & { source: string }).source : 'built-in'
    const key = `${agent.agentType}:${agentSource}`
    if (seen.has(key)) continue
    seen.add(key)

    const active = activeMap.get(agent.agentType)
    const activeSource = active && 'source' in active
      ? (active as AgentDefinition & { source: string }).source
      : undefined

    const overriddenBy =
      active && activeSource !== agentSource
        ? (activeSource as AgentSource)
        : undefined

    resolved.push({ ...agent, overriddenBy })
  }

  return resolved
}

/**
 * Resolve the display model string for an agent.
 * Returns the model alias or 'inherit' for display purposes.
 * QiLing default subagent model is 'inherit'.
 */
export function resolveAgentModelDisplay(
  agent: AgentDefinition,
): string | undefined {
  const model = agent.model ?? 'inherit'
  if (!model) return undefined
  return model === 'inherit' ? 'inherit' : model
}

/**
 * Get a human-readable label for the agent source.
 */
export function getOverrideSourceLabel(source: AgentSource): string {
  switch (source) {
    case 'user':
    case 'userSettings':
      return 'user'
    case 'project':
    case 'projectSettings':
      return 'project'
    case 'localSettings':
      return 'local'
    case 'policySettings':
      return 'managed'
    case 'flagSettings':
      return 'cli flag'
    case 'plugin':
      return 'plugin'
    case 'built-in':
      return 'built-in'
  }
}

/**
 * Compare agents alphabetically by name (case-insensitive).
 */
export function compareAgentsByName(
  a: AgentDefinition,
  b: AgentDefinition,
): number {
  return a.agentType.localeCompare(b.agentType, undefined, {
    sensitivity: 'base',
  })
}
