/**
 * Ink DOM types and node factory — adapted from CC's ink/dom.ts
 *
 * Defines the DOMElement type used by Ink's virtual DOM / reconciler,
 * and provides helper functions for tree traversal and property access.
 *
 * QiLing: type definitions are complete; createNode delegates to
 * Ink's reconciler (B-T4-10) which is not yet ported. Traversal
 * helpers are fully functional.
 */

import type { YogaRect } from './layout/yoga.js'

// ─── Core types ───────────────────────────────────────────────────────────────

export type TextNode = {
  nodeName: '#text'
  nodeValue: string
  parentNode: DOMElement | null
  // text nodes have no children, attributes, or yoga
  yogaNode?: undefined
}

export type DOMElement = {
  nodeName: string
  attributes: Record<string, unknown>
  childNodes: Array<DOMElement | TextNode>
  parentNode: DOMElement | null
  yogaNode?: unknown
  /** Rendered rect (cached after layout) */
  layoutRect?: YogaRect
  _eventHandlers?: Record<string, ((...args: unknown[]) => unknown) | undefined>
  focusManager?: {
    handleClickFocus: (node: DOMElement) => void
    focus: (id: string) => void
    focusNext: () => void
    focusPrev: () => void
  }
  isStaticDirty?: boolean
  staticNode?: DOMElement
  onRender?: () => void
  onImmediateRender?: () => void
  unstable_transformChildren?: (children: string) => string
}

export type DOMNode = DOMElement | TextNode

// ─── Type guards ──────────────────────────────────────────────────────────────

export function isTextNode(node: DOMNode): node is TextNode {
  return node.nodeName === '#text'
}

export function isDOMElement(node: DOMNode): node is DOMElement {
  return node.nodeName !== '#text'
}

// ─── Tree traversal ───────────────────────────────────────────────────────────

export function getChildren(node: DOMElement): DOMElement[] {
  return node.childNodes.filter(isDOMElement)
}

export function getTextChildren(node: DOMElement): TextNode[] {
  return node.childNodes.filter(isTextNode)
}

/** Flatten all text content of a subtree into a single string. */
export function getTextContent(node: DOMNode): string {
  if (isTextNode(node)) return node.nodeValue
  return node.childNodes.map(getTextContent).join('')
}

/** Walk the tree depth-first; return false from visitor to prune. */
export function walkDOM(node: DOMElement, visitor: (n: DOMElement) => boolean | void): void {
  if (visitor(node) === false) return
  for (const child of node.childNodes) {
    if (isDOMElement(child)) walkDOM(child, visitor)
  }
}

/** Find first descendant matching predicate (depth-first). */
export function findDOMNode(
  root: DOMElement,
  predicate: (n: DOMElement) => boolean,
): DOMElement | null {
  if (predicate(root)) return root
  for (const child of root.childNodes) {
    if (!isDOMElement(child)) continue
    const found = findDOMNode(child, predicate)
    if (found) return found
  }
  return null
}

// ─── Node factory (stub) ─────────────────────────────────────────────────────

/**
 * Create a new DOM element.
 * QiLing stub: wired to Ink's reconciler in B-T4-10 (reconciler.ts).
 */
export function createDOMElement(nodeName: string): DOMElement {
  return {
    nodeName,
    attributes: {},
    childNodes: [],
    parentNode: null,
  }
}

export function createTextNode(value: string): TextNode {
  return { nodeName: '#text', nodeValue: value, parentNode: null }
}
