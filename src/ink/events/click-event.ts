/**
 * Mouse click event — adapted from CC's ink/events/click-event.ts
 *
 * Fired on left-button release without drag, only when mouse tracking is
 * enabled (inside <AlternateScreen>). Bubbles from the deepest hit node up.
 * Call stopImmediatePropagation() to prevent ancestor onClick handlers.
 */

import { Event } from './event.js'

export class ClickEvent extends Event {
  /** 0-indexed screen column of the click */
  readonly col: number
  /** 0-indexed screen row of the click */
  readonly row: number
  /** Click column relative to the current handler's Box (col - box.x) */
  localCol = 0
  /** Click row relative to the current handler's Box (row - box.y) */
  localRow = 0
  /**
   * True if the clicked cell has no visible content.
   * Handlers can check this to ignore clicks on blank terminal space.
   */
  readonly cellIsBlank: boolean

  constructor(col: number, row: number, cellIsBlank: boolean) {
    super()
    this.col = col
    this.row = row
    this.cellIsBlank = cellIsBlank
  }
}
