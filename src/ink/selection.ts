/**
 * selection — adapted from CC's ink/selection.ts
 *
 * Text selection store for the alternate-screen terminal.
 * Tracks an anchor + focus point (like a browser text selection),
 * provides copy-to-clipboard, and notifies subscribers on change.
 */

import type { Screen } from './screen.js'
import type { SelectionState } from './hooks/use-selection.js'

type Listener = () => void

export class SelectionStore {
  private _state: SelectionState = null
  private _listeners = new Set<Listener>()
  private _bgColor = '#3a3a5c'

  getState(): SelectionState { return this._state }

  subscribe(listener: Listener): () => void {
    this._listeners.add(listener)
    return () => { this._listeners.delete(listener) }
  }

  private _notify(): void {
    for (const l of this._listeners) l()
  }

  setSelectionBgColor(color: string): void {
    this._bgColor = color
  }

  getSelectionBgColor(): string { return this._bgColor }

  hasSelection(): boolean { return this._state !== null }

  clearSelection(): void {
    if (!this._state) return
    this._state = null
    this._notify()
  }

  /** Set anchor and focus to start a new selection. */
  startSelection(row: number, col: number): void {
    this._state = {
      anchor: { row, col },
      focus:  { row, col },
      isDragging: true,
    }
    this._notify()
  }

  /** Update the focus point (e.g. on mouse drag). */
  updateFocus(row: number, col: number): void {
    if (!this._state) return
    this._state = { ...this._state, focus: { row, col } }
    this._notify()
  }

  /** End drag mode without clearing selection. */
  endDrag(): void {
    if (!this._state) return
    this._state = { ...this._state, isDragging: false }
    this._notify()
  }

  /**
   * Extract selected text from the screen buffer.
   * Returns empty string if no selection or no screen provided.
   */
  copySelection(screen?: Screen): string {
    if (!this._state || !screen) return ''
    return this._extractText(screen)
  }

  copySelectionNoClear(screen?: Screen): string {
    if (!this._state || !screen) return ''
    return this._extractText(screen)
  }

  private _extractText(screen: Screen): string {
    if (!this._state) return ''
    const { anchor, focus } = this._state
    const startRow = Math.min(anchor.row, focus.row)
    const endRow   = Math.max(anchor.row, focus.row)
    const startCol = startRow === endRow ? Math.min(anchor.col, focus.col) : 0
    const endCol   = startRow === endRow ? Math.max(anchor.col, focus.col) : screen.columns
    return screen.extractText(startRow, startCol, endRow, endCol)
  }

  shiftAnchor(dRow: number, minRow: number, maxRow: number): void {
    if (!this._state) return
    const row = Math.max(minRow, Math.min(maxRow, this._state.anchor.row + dRow))
    this._state = { ...this._state, anchor: { ...this._state.anchor, row } }
    this._notify()
  }

  shiftSelection(dRow: number, minRow: number, maxRow: number): void {
    if (!this._state) return
    const row = Math.max(minRow, Math.min(maxRow, this._state.focus.row + dRow))
    this._state = { ...this._state, focus: { ...this._state.focus, row } }
    this._notify()
  }
}

/** Module-level singleton (one selection per terminal session). */
export const selectionStore = new SelectionStore()
