/**
 * Tip scheduler — adapted from CC's services/tips/tipScheduler.ts
 *
 * Selects the most appropriate tip to show based on recency.
 * Uses tipHistory to track which tips have been shown recently.
 */

import { getSecondsSinceLastShown, recordTipShown } from './tipHistory.js'
import type { Tip } from '../../services/tips.js'

/**
 * Select the tip that hasn't been shown for the longest time.
 * Returns undefined if the list is empty.
 */
export function selectTipWithLongestTimeSinceShown(
  availableTips: Tip[],
): Tip | undefined {
  if (availableTips.length === 0) return undefined
  if (availableTips.length === 1) return availableTips[0]

  const tipsWithTime = availableTips.map(tip => ({
    tip,
    seconds: getSecondsSinceLastShown(tip.id),
  }))

  tipsWithTime.sort((a, b) => b.seconds - a.seconds)
  return tipsWithTime[0]?.tip
}

/**
 * Record that a tip was shown.
 */
export function recordShownTip(tip: Tip): void {
  recordTipShown(tip.id)
}
