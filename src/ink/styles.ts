/**
 * styles — adapted from CC's ink/styles.ts
 *
 * Ink style normalization and merging utilities.
 * Converts Ink's text/box style props into internal style objects
 * consumed by colorize.ts and render-node-to-output.ts.
 *
 * QiLing: partial implementation — covers the style props used by
 * QiLing's components. Full yoga flex-style props are handled by
 * Ink 5's reconciler internally.
 */

import type { StyleConfig } from './colorize.js'

/** Subset of Ink TextProps that map to terminal styles. */
export type TextStyle = {
  bold?: boolean
  dim?: boolean
  italic?: boolean
  underline?: boolean
  inverse?: boolean
  strikethrough?: boolean
  overline?: boolean
  color?: string
  backgroundColor?: string
}

/** Subset of Ink BoxProps layout values. */
export type BoxStyle = {
  width?: number | string
  height?: number | string
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
  flexGrow?: number
  flexShrink?: number
  flexBasis?: number | string
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch'
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around'
  gap?: number
  rowGap?: number
  columnGap?: number
  margin?: number
  marginX?: number
  marginY?: number
  marginTop?: number
  marginRight?: number
  marginBottom?: number
  marginLeft?: number
  padding?: number
  paddingX?: number
  paddingY?: number
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  overflow?: 'visible' | 'hidden'
  overflowX?: 'visible' | 'hidden'
  overflowY?: 'visible' | 'hidden'
  borderStyle?: string
  borderColor?: string
}

/**
 * Convert a TextStyle to a StyleConfig for colorize.ts.
 */
export function textStyleToConfig(style: TextStyle): StyleConfig {
  return {
    bold:            style.bold,
    dim:             style.dim,
    italic:          style.italic,
    underline:       style.underline,
    inverse:         style.inverse,
    strikethrough:   style.strikethrough,
    overline:        style.overline,
    color:           style.color,
    backgroundColor: style.backgroundColor,
  }
}

/**
 * Merge two TextStyle objects (child overrides parent for defined props).
 */
export function mergeTextStyles(parent: TextStyle, child: TextStyle): TextStyle {
  const result: TextStyle = { ...parent }
  for (const [k, v] of Object.entries(child) as Array<[keyof TextStyle, unknown]>) {
    if (v !== undefined) (result as Record<string, unknown>)[k] = v
  }
  return result
}

/**
 * Returns true if the style object has any visual styling (not just layout).
 */
export function hasVisualStyle(style: TextStyle): boolean {
  return !!(
    style.bold || style.dim || style.italic || style.underline ||
    style.inverse || style.strikethrough || style.overline ||
    style.color != null || style.backgroundColor != null
  )
}

/**
 * Resolve 'inherit' color to a specific color from parent context.
 * Stub: returns the value unchanged (real implementation tracks parent styles).
 */
export function resolveColor(color: string | undefined, _parentColor?: string): string | undefined {
  if (color === 'inherit') return _parentColor
  return color
}
