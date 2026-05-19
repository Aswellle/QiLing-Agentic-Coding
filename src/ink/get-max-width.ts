/**
 * getMaxWidth — adapted from CC's ink/get-max-width.ts
 *
 * Returns the yoga node's content width (minus padding and border).
 * Note: can return wider than parent in column-direction flex due to
 * yoga's AtMost vs Exactly measurement passes.
 */

type YogaNode = {
  getComputedWidth(): number
  getComputedPadding(edge: number): number
  getComputedBorder(edge: number): number
}

export const LayoutEdge = {
  Left: 1,
  Top: 0,
  Right: 3,
  Bottom: 2,
} as const

const getMaxWidth = (yogaNode: YogaNode): number => {
  return (
    yogaNode.getComputedWidth() -
    yogaNode.getComputedPadding(LayoutEdge.Left) -
    yogaNode.getComputedPadding(LayoutEdge.Right) -
    yogaNode.getComputedBorder(LayoutEdge.Left) -
    yogaNode.getComputedBorder(LayoutEdge.Right)
  )
}

export default getMaxWidth
