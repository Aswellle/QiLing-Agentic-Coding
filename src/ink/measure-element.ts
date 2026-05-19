/**
 * Measure Box element dimensions — adapted from CC's ink/measure-element.ts
 *
 * Returns the computed width and height of a Yoga layout node.
 * Used by useTerminalViewport and animation hooks to check element visibility.
 */

type DOMElement = {
  yogaNode?: {
    getComputedWidth(): number
    getComputedHeight(): number
  }
}

type Output = { width: number; height: number }

const measureElement = (node: DOMElement): Output => ({
  width: node.yogaNode?.getComputedWidth() ?? 0,
  height: node.yogaNode?.getComputedHeight() ?? 0,
})

export default measureElement
