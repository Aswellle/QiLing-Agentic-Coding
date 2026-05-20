/**
 * Hit-testing and hover dispatch — adapted from CC's ink/hit-test.ts
 *
 * hitTest: find deepest DOM element whose rendered rect contains (col, row).
 * dispatchClick: bubble ClickEvent from hit node up to root.
 * dispatchHover: fire mouseEnter/Leave as pointer moves (uses nodeCache rects).
 */

import { ClickEvent } from './events/click-event.js'
import type { EventHandlerProps } from './events/event-handlers.js'
import { nodeCache } from './node-cache.js'

type DOMElement = {
  nodeName: string
  childNodes: DOMElement[]
  parentNode: DOMElement | undefined
  attributes: Record<string, unknown>
  focusManager?: { handleClickFocus: (node: DOMElement) => void }
  _eventHandlers?: Record<string, unknown>
}

export function hitTest(node: DOMElement, col: number, row: number): DOMElement | null {
  const rect = nodeCache.get(node as object)
  if (!rect) return null
  if (col < rect.x || col >= rect.x + rect.width || row < rect.y || row >= rect.y + rect.height) return null
  for (let i = node.childNodes.length - 1; i >= 0; i--) {
    const child = node.childNodes[i]!
    if (child.nodeName === '#text') continue
    const hit = hitTest(child, col, row)
    if (hit) return hit
  }
  return node
}

export function dispatchClick(root: DOMElement, col: number, row: number, cellIsBlank = false): boolean {
  let target: DOMElement | undefined = hitTest(root, col, row) ?? undefined
  if (!target) return false

  if (root.focusManager) {
    let focusTarget: DOMElement | undefined = target
    while (focusTarget) {
      if (typeof focusTarget.attributes['tabIndex'] === 'number') { root.focusManager.handleClickFocus(focusTarget); break }
      focusTarget = focusTarget.parentNode
    }
  }

  const event = new ClickEvent(col, row, cellIsBlank)
  let handled = false
  while (target) {
    const handler = (target._eventHandlers as EventHandlerProps | undefined)?.onClick
    if (handler) {
      handled = true
      const rect = nodeCache.get(target as object)
      if (rect) { (event as ClickEvent & { localCol?: number; localRow?: number }).localCol = col - rect.x; (event as ClickEvent & { localRow?: number }).localRow = row - rect.y }
      handler(event)
      if (event.didStopImmediatePropagation()) return true
    }
    target = target.parentNode
  }
  return handled
}

export function dispatchHover(root: DOMElement, col: number, row: number, hovered: Set<DOMElement>): void {
  const next = new Set<DOMElement>()
  let node: DOMElement | undefined = hitTest(root, col, row) ?? undefined
  while (node) {
    const h = node._eventHandlers as EventHandlerProps | undefined
    if (h?.onMouseEnter || h?.onMouseLeave) next.add(node)
    node = node.parentNode
  }
  for (const old of hovered) {
    if (!next.has(old)) {
      hovered.delete(old)
      if (old.parentNode) (old._eventHandlers as EventHandlerProps | undefined)?.onMouseLeave?.()
    }
  }
  for (const n of next) {
    if (!hovered.has(n)) {
      hovered.add(n)
      ;(n._eventHandlers as EventHandlerProps | undefined)?.onMouseEnter?.()
    }
  }
}
