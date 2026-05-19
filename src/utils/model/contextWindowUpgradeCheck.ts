/**
 * Context window upgrade check — adapted from CC's utils/model/contextWindowUpgradeCheck.ts
 *
 * Checks if the user can upgrade to a 1M context model and provides
 * appropriate tip/warning messages.
 */

import { checkOpus1mAccess, checkSonnet1mAccess } from './check1mAccess.js'

/**
 * Get available context window upgrade for the current model setting.
 * Returns null if no upgrade is available or the user already has max context.
 */
function getAvailableUpgrade(currentModel: string): {
  alias: string
  name: string
  multiplier: number
} | null {
  const lower = currentModel.toLowerCase()
  if ((lower === 'opus' || lower.includes('opus')) && checkOpus1mAccess()) {
    return { alias: 'opus[1m]', name: 'Opus 1M', multiplier: 5 }
  }
  if ((lower === 'sonnet' || lower.includes('sonnet')) && checkSonnet1mAccess()) {
    return { alias: 'sonnet[1m]', name: 'Sonnet 1M', multiplier: 5 }
  }
  return null
}

/**
 * Get upgrade message for different contexts.
 * - 'warning': Short command hint (e.g., "/model opus[1m]")
 * - 'tip': Full tip message with context multiplier info
 *
 * Returns null if no upgrade is available.
 */
export function getUpgradeMessage(
  currentModel: string,
  context: 'warning' | 'tip',
): string | null {
  const upgrade = getAvailableUpgrade(currentModel)
  if (!upgrade) return null

  switch (context) {
    case 'warning': return `/model ${upgrade.alias}`
    case 'tip':     return `提示: 你可以使用 ${upgrade.name}，上下文窗口扩大 ${upgrade.multiplier} 倍`
    default:        return null
  }
}
