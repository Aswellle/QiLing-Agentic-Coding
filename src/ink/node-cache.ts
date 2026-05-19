/**
 * Node layout cache — adapted from CC's ink/node-cache.ts
 *
 * WeakMap caches for per-render layout bounds and pending clears.
 * Avoids re-reading Yoga on every tick for clean nodes.
 */

export type CachedLayout = {
  x: number
  y: number
  width: number
  height: number
  top?: number
}

type AnyElement = object

// Yoga-local computed layout bounds, keyed per DOMElement
export const nodeCache = new WeakMap<AnyElement, CachedLayout>()

// Rects of removed children that need clearing on next render
export const pendingClears = new WeakMap<AnyElement, { x: number; y: number; width: number; height: number }[]>()

let absoluteNodeRemoved = false

export function addPendingClear(
  parent: AnyElement,
  rect: { x: number; y: number; width: number; height: number },
  isAbsolute: boolean,
): void {
  const existing = pendingClears.get(parent)
  if (existing) {
    existing.push(rect)
  } else {
    pendingClears.set(parent, [rect])
  }
  if (isAbsolute) absoluteNodeRemoved = true
}

export function consumeAbsoluteRemovedFlag(): boolean {
  const had = absoluteNodeRemoved
  absoluteNodeRemoved = false
  return had
}
