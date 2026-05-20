/**
 * Layout engine factory — adapted from CC's ink/layout/engine.ts
 *
 * Creates a LayoutNode using the Yoga layout engine.
 * In QiLing: stub implementation (actual Yoga node is managed by ink package).
 */

import type { LayoutNode } from './node.js'

export function createLayoutNode(): LayoutNode {
  throw new Error('createLayoutNode: Yoga layout is managed by the ink package in QiLing')
}
