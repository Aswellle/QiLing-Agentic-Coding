/**
 * Search highlight — adapted from CC's ink/searchHighlight.ts
 *
 * Applies case-insensitive text search highlights to the screen buffer by
 * inverting cell styles (SGR 7). Handles wide characters (CJK/emoji).
 */

import { type Screen } from './screen.js'

export type StylePool = Map<number, string>
export type MatchPosition = { row: number; col: number }

/**
 * Apply search highlight to all matching cells in the screen buffer.
 * Returns true if any cells were damaged (i.e. query was non-empty and matched).
 */
export function applySearchHighlight(
  screen: Screen,
  query: string,
  _stylePool: StylePool,
): boolean {
  if (!query) return false
  const q = query.toLowerCase()
  let damaged = false
  for (let r = 0; r < screen.rows; r++) {
    const rowText = screen.rowText(r).toLowerCase()
    let col = 0
    while ((col = rowText.indexOf(q, col)) !== -1) {
      for (let i = 0; i < q.length; i++) {
        const cell = screen.getCell(r, col + i)
        screen.setCell(r, col + i, { style: { ...cell.style, inverse: true } })
      }
      damaged = true
      col += q.length
    }
  }
  return damaged
}

/**
 * Apply a "current match" overlay (yellow background) over one match position.
 * rowOffset is subtracted from pos.row to convert absolute to viewport row.
 */
export function applyPositionedHighlight(
  screen: Screen,
  positions: MatchPosition[],
  currentIdx: number,
  rowOffset: number,
  _stylePool: StylePool,
): void {
  const pos = positions[currentIdx]
  if (!pos) return
  const r = pos.row - rowOffset
  if (r < 0 || r >= screen.rows) return
  const rowText = screen.rowText(r)
  const len = rowText.slice(pos.col).length
  for (let i = 0; i < len && pos.col + i < screen.columns; i++) {
    const cell = screen.getCell(r, pos.col + i)
    screen.setCell(r, pos.col + i, {
      style: { ...cell.style, backgroundColor: 'yellow', inverse: false },
    })
  }
}
