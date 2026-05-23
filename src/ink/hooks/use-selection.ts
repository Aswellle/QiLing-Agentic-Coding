/**
 * Text selection hook — adapted from CC's ink/hooks/use-selection.ts
 *
 * Provides access to the Ink instance's text selection operations
 * (fullscreen alt-screen mode only). All operations are no-ops outside
 * alt-screen because the selection state lives on the Ink instance's
 * internal screen buffer.
 *
 * QiLing stub: The underlying selection machinery lives in ink/selection.ts
 * and ink/screen.ts, which depend on the full Ink internal renderer
 * (B-T4-11 / B-T4-13). Until those are ported, this hook returns no-ops.
 *
 * Phase B-T4-11 adapt-complete: wire to the real selection store.
 */

export type FocusMove =
  | { type: 'left' }
  | { type: 'right' }
  | { type: 'up' }
  | { type: 'down' }

export type SelectionState = {
  anchor: { row: number; col: number }
  focus: { row: number; col: number }
  isDragging: boolean
} | null

export type SelectionHook = {
  copySelection: () => string
  copySelectionNoClear: () => string
  clearSelection: () => void
  hasSelection: () => boolean
  getState: () => SelectionState
  subscribe: (cb: () => void) => () => void
  shiftAnchor: (dRow: number, minRow: number, maxRow: number) => void
  shiftSelection: (dRow: number, minRow: number, maxRow: number) => void
  moveFocus: (move: FocusMove) => void
  captureScrolledRows: (firstRow: number, lastRow: number, side: 'above' | 'below') => void
  setSelectionBgColor: (color: string) => void
}

const NO_OP_SELECTION: SelectionHook = {
  copySelection:        () => '',
  copySelectionNoClear: () => '',
  clearSelection:       () => {},
  hasSelection:         () => false,
  getState:             () => null,
  subscribe:            () => () => {},
  shiftAnchor:          () => {},
  shiftSelection:       () => {},
  moveFocus:            () => {},
  captureScrolledRows:  () => {},
  setSelectionBgColor:  () => {},
}

/**
 * Access text selection operations.
 * Returns no-op functions until ink/selection.ts + ink/screen.ts are ported.
 */
export function useSelection(): SelectionHook {
  // QiLing stub: wire to real ink instance selection in B-T4-11
  return NO_OP_SELECTION
}
