/**
 * Agent color manager — ported from CC's AgentTool/agentColorManager.ts
 *
 * Assigns one of 8 accent colors to named agent types for display in the TUI.
 * Colors map to theme tokens defined in src/utils/theme.ts.
 *
 * API:
 *   getAgentColor(agentType) → keyof Theme | undefined
 *   setAgentColor(agentType, color) → void
 */

import type { Theme } from '../../utils/theme'

export type AgentColorName =
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'purple'
  | 'orange'
  | 'pink'
  | 'cyan'

export const AGENT_COLORS: readonly AgentColorName[] = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'orange',
  'pink',
  'cyan',
] as const

export const AGENT_COLOR_TO_THEME_COLOR = {
  red: 'red_FOR_SUBAGENTS_ONLY',
  blue: 'blue_FOR_SUBAGENTS_ONLY',
  green: 'green_FOR_SUBAGENTS_ONLY',
  yellow: 'yellow_FOR_SUBAGENTS_ONLY',
  purple: 'purple_FOR_SUBAGENTS_ONLY',
  orange: 'orange_FOR_SUBAGENTS_ONLY',
  pink: 'pink_FOR_SUBAGENTS_ONLY',
  cyan: 'cyan_FOR_SUBAGENTS_ONLY',
} as const satisfies Record<AgentColorName, keyof Theme>

// Module-level map (replaces CC's bootstrap/state agentColorMap)
const agentColorMap = new Map<string, AgentColorName>()
function getAgentColorMap(): Map<string, AgentColorName> {
  return agentColorMap
}

export function getAgentColor(agentType: string): keyof Theme | undefined {
  if (agentType === 'general-purpose') {
    return undefined
  }

  const colorMap = getAgentColorMap()

  // Return theme key if a color is already assigned
  const existingColor = colorMap.get(agentType)
  if (existingColor && AGENT_COLORS.includes(existingColor)) {
    return AGENT_COLOR_TO_THEME_COLOR[existingColor]
  }

  return undefined
}

export function setAgentColor(
  agentType: string,
  color: AgentColorName | undefined,
): void {
  const colorMap = getAgentColorMap()

  if (!color) {
    colorMap.delete(agentType)
    return
  }

  if (AGENT_COLORS.includes(color)) {
    colorMap.set(agentType, color)
  }
}
