/**
 * Ink color conversion utility — adapted from CC's utils/ink.ts
 *
 * Converts agent color strings to Ink's TextProps['color'] format,
 * mapping known AgentColorName values to theme keys.
 */

import {
  AGENT_COLOR_TO_THEME_COLOR,
  type AgentColorName,
} from '../tools/AgentTool/agentColorManager.js'

const DEFAULT_AGENT_THEME_COLOR = 'cyan'

/**
 * Convert a color string to a valid Ink text color.
 * - Known AgentColorName (blue, green, etc.) → theme color key
 * - Unknown → raw color value (ANSI or hex)
 * - undefined → default cyan
 */
export function toInkColor(color: string | undefined): string {
  if (!color) return DEFAULT_AGENT_THEME_COLOR

  const themeColor = AGENT_COLOR_TO_THEME_COLOR[color as AgentColorName]
  if (themeColor) return themeColor as string

  return color
}
