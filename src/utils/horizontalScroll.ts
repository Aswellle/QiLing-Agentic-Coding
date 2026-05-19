/**
 * Horizontal scroll window calculator — adapted from CC's utils/horizontalScroll.ts
 *
 * Edge-based scrolling: window only scrolls when selected item would be outside
 * the visible range, positioning it at the edge. Used for tab bars and pickers.
 */

export type HorizontalScrollWindow = {
  startIndex: number
  endIndex: number
  showLeftArrow: boolean
  showRightArrow: boolean
}

export function calculateHorizontalScrollWindow(
  itemWidths: number[],
  availableWidth: number,
  arrowWidth: number,
  selectedIdx: number,
  firstItemHasSeparator = true,
): HorizontalScrollWindow {
  const totalItems = itemWidths.length

  if (totalItems === 0) {
    return { startIndex: 0, endIndex: 0, showLeftArrow: false, showRightArrow: false }
  }

  const clampedSelected = Math.max(0, Math.min(selectedIdx, totalItems - 1))
  const totalWidth = itemWidths.reduce((sum, w) => sum + w, 0)

  if (totalWidth <= availableWidth) {
    return { startIndex: 0, endIndex: totalItems, showLeftArrow: false, showRightArrow: false }
  }

  const cumulative: number[] = [0]
  for (let i = 0; i < totalItems; i++) cumulative.push(cumulative[i]! + itemWidths[i]!)

  function rangeWidth(start: number, end: number): number {
    const base = cumulative[end]! - cumulative[start]!
    return firstItemHasSeparator && start > 0 ? base - 1 : base
  }

  function effectiveWidth(start: number, end: number): number {
    let w = availableWidth
    if (start > 0) w -= arrowWidth
    if (end < totalItems) w -= arrowWidth
    return w
  }

  let startIndex = 0, endIndex = 1
  while (endIndex < totalItems && rangeWidth(startIndex, endIndex + 1) <= effectiveWidth(startIndex, endIndex + 1)) {
    endIndex++
  }

  if (clampedSelected >= startIndex && clampedSelected < endIndex) {
    return { startIndex, endIndex, showLeftArrow: startIndex > 0, showRightArrow: endIndex < totalItems }
  }

  if (clampedSelected >= endIndex) {
    endIndex = clampedSelected + 1
    startIndex = clampedSelected
    while (startIndex > 0 && rangeWidth(startIndex - 1, endIndex) <= effectiveWidth(startIndex - 1, endIndex)) {
      startIndex--
    }
  } else {
    startIndex = clampedSelected
    endIndex = clampedSelected + 1
    while (endIndex < totalItems && rangeWidth(startIndex, endIndex + 1) <= effectiveWidth(startIndex, endIndex + 1)) {
      endIndex++
    }
  }

  return { startIndex, endIndex, showLeftArrow: startIndex > 0, showRightArrow: endIndex < totalItems }
}
