/**
 * CSI (Control Sequence Introducer) — core terminal control sequences
 * Adapted from CC's ink/termio/csi.ts with additional constants and helpers.
 */

export const ESC = '\x1b'
export const CSI = ESC + '['

/** Generate a CSI sequence: ESC [ params command */
export function csi(params: string | number, command?: string): string {
  if (command !== undefined) return CSI + String(params) + command
  return CSI + String(params)
}

/** Move cursor to top-left (1;1H) */
export const CURSOR_HOME = `${CSI}1;1H`

/** Erase entire display (2J) */
export const ERASE_SCREEN = `${CSI}2J`

/** Erase scrollback buffer (3J) */
export const ERASE_SCROLLBACK = `${CSI}3J`

/** Move cursor by relative x/y offset */
export function cursorMove(x: number, y: number): string {
  let seq = ''
  if (y < 0) seq += `${CSI}${-y}A`
  else if (y > 0) seq += `${CSI}${y}B`
  if (x > 0) seq += `${CSI}${x}C`
  else if (x < 0) seq += `${CSI}${-x}D`
  return seq
}

/** Move cursor to absolute position (col, row are 1-based) */
export function cursorTo(col: number, row: number): string {
  return `${CSI}${row};${col}H`
}

/** Erase N lines, moving cursor up */
export function eraseLines(count: number): string {
  let result = ''
  for (let i = 0; i < count; i++) {
    result += `${CSI}2K`
    if (i < count - 1) result += `${CSI}1A`
  }
  return result
}
