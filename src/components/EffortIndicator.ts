/**
 * Effort level indicator utilities — adapted from CC's components/EffortIndicator.ts
 *
 * Maps effort levels to Unicode symbols for display in the status bar and notifications.
 *
 * @example
 * effortLevelToSymbol('medium') // '◐'
 * getEffortNotificationText(effortValue, model) // '◐ medium · /effort'
 */

import {
  EFFORT_HIGH,
  EFFORT_LOW,
  EFFORT_MAX,
  EFFORT_MEDIUM,
} from '../constants/figures.js'
import { type EffortLevel, modelSupportsEffort } from '../utils/effort.js'

/**
 * Build the text for the effort-changed notification.
 * Returns undefined if the model doesn't support effort.
 */
export function getEffortNotificationText(
  effortLevel: EffortLevel | undefined,
  model: string,
): string | undefined {
  if (!modelSupportsEffort(model)) return undefined
  const level = effortLevel ?? 'high'
  return `${effortLevelToSymbol(level)} ${level} · /effort`
}

export function effortLevelToSymbol(level: EffortLevel): string {
  switch (level) {
    case 'low':    return EFFORT_LOW
    case 'medium': return EFFORT_MEDIUM
    case 'high':   return EFFORT_HIGH
    case 'max':    return EFFORT_MAX
    default:       return EFFORT_HIGH
  }
}
