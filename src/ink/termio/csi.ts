/**
 * CSI (Control Sequence Introducer) — core terminal control sequences
 * Adapted from CC's ink/termio/csi.ts with full constants for parser.ts.
 */

export const ESC = '\x1b'
export const CSI_STR = ESC + '['

/** Generate a CSI sequence (string or number params + optional command) */
export function csi(params: string | number, command?: string): string {
  if (command !== undefined) return CSI_STR + String(params) + command
  return CSI_STR + String(params)
}

/** Move cursor to top-left (1;1H) */
export const CURSOR_HOME = `${CSI_STR}1;1H`
/** Erase entire display (2J) */
export const ERASE_SCREEN = `${CSI_STR}2J`
/** Erase scrollback buffer (3J) */
export const ERASE_SCROLLBACK = `${CSI_STR}3J`

export function cursorMove(x: number, y: number): string {
  let seq = ''
  if (y < 0) seq += `${CSI_STR}${-y}A`
  else if (y > 0) seq += `${CSI_STR}${y}B`
  if (x > 0) seq += `${CSI_STR}${x}C`
  else if (x < 0) seq += `${CSI_STR}${-x}D`
  return seq
}

export function cursorTo(col: number, row: number): string {
  return `${CSI_STR}${row};${col}H`
}

export function eraseLines(count: number): string {
  let result = ''
  for (let i = 0; i < count; i++) {
    result += `${CSI_STR}2K`
    if (i < count - 1) result += `${CSI_STR}1A`
  }
  return result
}

/** CSI parameter byte: 0x30–0x3F */
export function isCSIParam(code: number): boolean { return code >= 0x30 && code <= 0x3f }
/** CSI intermediate byte: 0x20–0x2F */
export function isCSIIntermediate(code: number): boolean { return code >= 0x20 && code <= 0x2f }
/** CSI final byte: 0x40–0x7E */
export function isCSIFinal(code: number): boolean { return code >= 0x40 && code <= 0x7e }

/** CSI command final bytes (used by parser.ts) */
export const CSI = {
  CUU: 0x41, CUD: 0x42, CUF: 0x43, CUB: 0x44,
  CNL: 0x45, CPL: 0x46, CHA: 0x47, CUP: 0x48,
  CHT: 0x49, VPA: 0x64, HVP: 0x66,
  ED: 0x4a, EL: 0x4b, ECH: 0x58,
  IL: 0x4c, DL: 0x4d, ICH: 0x40, DCH: 0x50,
  SU: 0x53, SD: 0x54,
  SM: 0x68, RM: 0x6c,
  SGR: 0x6d,
  DSR: 0x6e,
  DECSCUSR: 0x71,
  DECSTBM: 0x72,
  SCOSC: 0x73, SCORC: 0x75,
  CBT: 0x5a,
} as const

export const ERASE_DISPLAY = ['toEnd', 'toStart', 'all', 'scrollback'] as const
export const ERASE_LINE_REGION = ['toEnd', 'toStart', 'all'] as const

export type CursorStyle = 'block' | 'underline' | 'bar'
export const CURSOR_STYLES: Array<{ style: CursorStyle; blinking: boolean }> = [
  { style: 'block', blinking: true },
  { style: 'block', blinking: true },
  { style: 'block', blinking: false },
  { style: 'underline', blinking: true },
  { style: 'underline', blinking: false },
  { style: 'bar', blinking: true },
  { style: 'bar', blinking: false },
]
