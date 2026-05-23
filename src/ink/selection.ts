/**
 * selection — adapted from CC's ink/selection.ts
 *
 * Text selection store for the alternate-screen terminal.
 * Tracks an anchor + focus point (like a browser text selection),
 * provides copy-to-clipboard, and notifies subscribers on change.
 *
 * QiLing stub: the actual clipboard + screen-buffer text extraction
 * depends on screen.ts (B-T4-13). The store and subscriber API are
 * fully functional; copy operations are no-ops until screen.ts lands.
 *
 * Phase B-T4-13: wire copyFromScreen() to real screen buffer reads.
 */

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
   * Copy selected text to clipboard.
   * QiLing stub: returns '' until screen.ts is ported (B-T4-13).
   */
  copySelection(): string {
    return ''
  }

  copySelectionNoClear(): string {
    return ''
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
