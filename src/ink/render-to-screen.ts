/**
 * render-to-screen — adapted from CC's ink/render-to-screen.ts
 *
 * Traverses the Ink DOM node tree and writes each node's text content
 * into a 2D screen buffer, applying SGR styles and handling wrapping.
 *
 * QiLing stub: the Screen type (B-T4-13) and yoga rect data are not yet
 * available. This module exports the correct signatures so importers
 * type-check; real rendering is delegated to Ink 5's internal pipeline.
 *
 * Phase B-T4-13: replace stub bodies with actual screen-buffer writes.
 */

import type { Frame, Screen } from './frame.js'

export type RenderOptions = {
  /** If true, render only nodes in the given viewport row range */
  viewportTop?: number
  viewportBottom?: number
  /** Clip output to this column width */
  maxColumns?: number
}

/**
 * Render the Ink DOM tree rooted at `node` into `screen`.
 * Returns true if any content was written.
 *
 * QiLing stub: no-op until screen.ts is ported (B-T4-13).
 */
export function renderNodeToScreen(
  _node: unknown,
  _screen: Screen,
  _options?: RenderOptions,
): boolean {
  return false
}

/**
 * Render the full frame from root node.
 * Returns a Frame snapshot that can be diffed against the previous frame.
 *
 * QiLing stub: returns an empty frame.
 */
export function renderToScreen(
  _rootNode: unknown,
  _rows: number,
  _columns: number,
  _options?: RenderOptions,
): Frame {
  return {
    screen: { width: _columns, height: _rows },
    viewport: { width: _columns, height: _rows },
    cursor: { x: 0, y: 0, visible: true },
  }
}

/**
 * Clear a region of the screen buffer.
 * QiLing stub: no-op until screen.ts is ported.
 */
export function clearScreen(_screen: Screen, _top = 0, _bottom?: number): void {}
