/**
 * ANSI-aware text wrapping — adapted from CC's ink/wrap-text.ts
 *
 * Supports wrap, wrap-trim, truncate-end/middle/start modes.
 * Uses sliceAnsi for correct wide-char truncation boundaries.
 */

import sliceAnsi from '../utils/sliceAnsi.js'
import { stringWidth } from './stringWidth.js'
import { wrapAnsi } from './wrapAnsi.js'

type TextWrap = 'wrap' | 'wrap-trim' | 'truncate' | 'truncate-start' | 'truncate-middle' | 'truncate-end'

const ELLIPSIS = '…'

function sliceFit(text: string, start: number, end: number): string {
  const s = sliceAnsi(text, start, end)
  return stringWidth(s) > end - start ? sliceAnsi(text, start, end - 1) : s
}

function truncate(text: string, columns: number, position: 'start' | 'middle' | 'end'): string {
  if (columns < 1) return ''
  if (columns === 1) return ELLIPSIS
  const length = stringWidth(text)
  if (length <= columns) return text
  if (position === 'start') return ELLIPSIS + sliceFit(text, length - columns + 1, length)
  if (position === 'middle') {
    const half = Math.floor(columns / 2)
    return sliceFit(text, 0, half) + ELLIPSIS + sliceFit(text, length - (columns - half) + 1, length)
  }
  return sliceFit(text, 0, columns - 1) + ELLIPSIS
}

export default function wrapText(text: string, maxWidth: number, wrapType: TextWrap): string {
  if (wrapType === 'wrap') return wrapAnsi(text, maxWidth, { trim: false, hard: true })
  if (wrapType === 'wrap-trim') return wrapAnsi(text, maxWidth, { trim: true, hard: true })
  if (wrapType!.startsWith('truncate')) {
    const position = wrapType === 'truncate-middle' ? 'middle' : wrapType === 'truncate-start' ? 'start' : 'end'
    return truncate(text, maxWidth, position)
  }
  return text
}
