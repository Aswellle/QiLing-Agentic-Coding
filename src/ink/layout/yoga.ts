/**
 * yoga — adapted from CC's ink/layout/yoga.ts
 *
 * Thin adapter for the Yoga flexbox layout engine used by Ink.
 * Ink 5 vendors its own yoga-wasm build and manages the lifecycle
 * internally; this module exposes helpers for reading computed
 * layout results from Ink DOM nodes.
 *
 * QiLing: re-exports yoga type constants and provides utility
 * functions to read layout rects from Ink's internal yoga nodes.
 * Full yoga lifecycle (createNode, insertChild, calculateLayout)
 * is delegated to Ink 5's reconciler.
 */

/** A computed layout rectangle from Yoga. */
export type YogaRect = {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** Edge values (top/right/bottom/left) as returned by Yoga. */
export type YogaEdges = {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}

/** Alignment constants (mirrors YogaAlign enum). */
export const YogaAlign = {
  auto:          0,
  flexStart:     1,
  center:        2,
  flexEnd:       3,
  stretch:       4,
  baseline:      5,
  spaceBetween:  6,
  spaceAround:   7,
  spaceEvenly:   8,
} as const

/** Flex direction constants. */
export const YogaFlexDirection = {
  column:        0,
  columnReverse: 1,
  row:           2,
  rowReverse:    3,
} as const

/** Justify content constants. */
export const YogaJustifyContent = {
  flexStart:    0,
  center:       1,
  flexEnd:      2,
  spaceBetween: 3,
  spaceAround:  4,
  spaceEvenly:  5,
} as const

/** Position type constants. */
export const YogaPositionType = {
  static:   0,
  relative: 1,
  absolute: 2,
} as const

/** Display constants. */
export const YogaDisplay = {
  flex: 0,
  none: 1,
} as const

/** Overflow constants. */
export const YogaOverflow = {
  visible: 0,
  hidden:  1,
  scroll:  2,
} as const

/** Wrap constants. */
export const YogaWrap = {
  noWrap:      0,
  wrap:        1,
  wrapReverse: 2,
} as const

/**
 * Extract the computed layout rect from an Ink DOM yoga node.
 * Returns null if the node has not been laid out yet.
 */
export function getLayoutRect(yogaNode: unknown): YogaRect | null {
  if (!yogaNode || typeof yogaNode !== 'object') return null
  const n = yogaNode as Record<string, (...args: unknown[]) => number>
  try {
    return {
      x:      n['getComputedLeft']?.() ?? 0,
      y:      n['getComputedTop']?.() ?? 0,
      width:  n['getComputedWidth']?.() ?? 0,
      height: n['getComputedHeight']?.() ?? 0,
    }
  } catch {
    return null
  }
}

/**
 * Extract computed padding edges from a yoga node.
 */
export function getPaddingEdges(yogaNode: unknown): YogaEdges {
  const n = (yogaNode ?? {}) as Record<string, (...args: unknown[]) => number>
  const edge = (fn: string) => { try { return n[fn]?.() ?? 0 } catch { return 0 } }
  return {
    top:    edge('getComputedPaddingTop'),
    right:  edge('getComputedPaddingRight'),
    bottom: edge('getComputedPaddingBottom'),
    left:   edge('getComputedPaddingLeft'),
  }
}
