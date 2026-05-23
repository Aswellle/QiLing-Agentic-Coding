/**
 * reconciler — adapted from CC's ink/reconciler.ts
 *
 * React custom reconciler that maps JSX elements onto Ink's virtual
 * DOM (DOMElement / TextNode) and triggers re-renders via the renderer.
 *
 * QiLing stub: Ink 5 ships its own React reconciler internally via
 * react-reconciler. This module exposes the public API surface
 * (createContainer, updateContainer, etc.) so importers type-check.
 * Full reconciler logic is handled by Ink 5's npm package.
 *
 * Phase B-T4-14: wire createContainer to ink.tsx's render() path for
 * custom per-frame hooks (search highlight, selection overlay).
 */

import type React from 'react'
import type { DOMElement } from './dom.js'

// ─── Container ────────────────────────────────────────────────────────────────

export type ReconcilerContainer = {
  /** Root DOM node for the Ink tree. */
  rootNode: DOMElement
  /** Callback invoked after each commit (render). */
  onCommit?: () => void
}

// ─── Public API (mirrors react-reconciler OpaqueRoot shape) ──────────────────

/**
 * Create a reconciler container wrapping a root DOM node.
 * QiLing stub: real container created by Ink 5 internally.
 */
export function createContainer(rootNode: DOMElement, onCommit?: () => void): ReconcilerContainer {
  return { rootNode, onCommit }
}

/**
 * Render or update a React element tree into the container.
 * QiLing stub: delegates to Ink 5's internal render via ink.tsx.
 */
export function updateContainer(
  _element: React.ReactNode,
  _container: ReconcilerContainer,
): void {
  // no-op: Ink 5's reconciler handles this internally
}

/**
 * Unmount a container and flush any pending work.
 * QiLing stub: no-op until B-T4-14 wires the ink instance lifecycle.
 */
export function unmountContainer(_container: ReconcilerContainer): void {}

/**
 * Returns the Ink DOM root node from the container.
 * Used by hit-test, event dispatcher, and search highlight.
 */
export function getContainerRoot(container: ReconcilerContainer): DOMElement {
  return container.rootNode
}

// ─── Fiber introspection helpers ─────────────────────────────────────────────

/**
 * Walk the React fiber tree from a DOM node to find the nearest
 * React component instance. Used for focus management.
 * QiLing stub: returns null until the full reconciler is wired.
 */
export function getFiberFromDOMNode(_node: DOMElement): unknown {
  return null
}
