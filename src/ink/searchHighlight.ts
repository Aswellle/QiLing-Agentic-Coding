/**
 * Search highlight — adapted from CC's ink/searchHighlight.ts
 *
 * Applies case-insensitive text search highlights to the screen buffer by
 * inverting cell styles (SGR 7). Handles wide characters (CJK/emoji).
 *
 * QiLing stub: QiLing does not yet have the ink screen buffer (ink/screen.ts)
 * required to implement this. The function signatures are exported so
 * consumers compile; actual highlighting requires Phase B-T4-13 (screen.ts).
 *
 * Phase B-T4-13 adapt-complete: replace stub bodies with real implementation.
 */

// Stub types matching CC's screen.ts interface shape
export type StylePool = Map<number, string>
export type Screen = {
  width: number
  height: number
  noSelect?: Uint8Array
  cells?: unknown[]
}
export type MatchPosition = { row: number; col: number }

/**
 * Apply search highlight to screen buffer cells.
 * Stub: always returns false (no damage). Wire to screen.ts in B-T4-13.
 */
export function applySearchHighlight(
  _screen: Screen,
  _query: string,
  _stylePool: StylePool,
): boolean {
  return false
}

/**
 * Apply a positioned "current match" overlay (yellow highlight).
 * Stub: no-op. Wire to screen.ts in B-T4-13.
 */
export function applyPositionedHighlight(
  _screen: Screen,
  _positions: MatchPosition[],
  _currentIdx: number,
  _rowOffset: number,
  _stylePool: StylePool,
): void {}
