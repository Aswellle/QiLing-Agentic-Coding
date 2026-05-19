/**
 * Fast mode lightning bolt icon — adapted from CC's components/FastIcon.tsx
 *
 * Used in the status bar and prompt input to indicate fast mode is active.
 * Supports a "cooldown" state when fast mode rate limit is temporarily hit.
 */

import React from 'react'
import { Text } from 'ink'
import { LIGHTNING_BOLT } from '../constants/figures.js'

type Props = {
  cooldown?: boolean
}

export function FastIcon({ cooldown }: Props): React.ReactNode {
  if (cooldown) {
    return <Text dimColor>{LIGHTNING_BOLT}</Text>
  }
  return <Text color="cyan">{LIGHTNING_BOLT}</Text>
}

/**
 * Get the fast mode icon as a plain string with optional chalk coloring.
 * For non-React contexts (CLI output, log messages).
 */
export function getFastIconString(applyColor = true, cooldown = false): string {
  if (!applyColor) return LIGHTNING_BOLT
  // Simplified without full theme support
  if (cooldown) return LIGHTNING_BOLT
  return LIGHTNING_BOLT
}
