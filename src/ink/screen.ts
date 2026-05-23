/**
 * screen — adapted from CC's ink/screen.ts
 *
 * 2D terminal screen buffer: a grid of styled cells. Used by the
 * rendering pipeline (render-node-to-output, optimizer, searchHighlight)
 * to build frames before diffing against the previous frame.
 *
 * QiLing: simplified implementation that covers the public API used by
 * dependent modules (selection, searchHighlight, optimizer).
 * CC's screen.ts has ~1486 lines with style pools, char pools, hyperlink
 * tracking, Unicode combining chars, and bi-directional text rendering.
 * We implement the core structure and defer the heavy optimizations to
 * Phase C incremental improvements.
 */

// ─── Cell ─────────────────────────────────────────────────────────────────────

export type CellStyle = {
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

export type Cell = {
  char: string
  style: CellStyle
  /** Column width of this cell (1 = normal, 2 = wide/CJK, 0 = continuation) */
  width: 1 | 2 | 0
  /** Hyperlink URI associated with this cell, if any */
  href?: string
}

const EMPTY_CELL: Cell = { char: ' ', style: {}, width: 1 }

// ─── Screen ───────────────────────────────────────────────────────────────────

export class Screen {
  readonly rows: number
  readonly columns: number
  private _cells: Cell[][]

  constructor(rows: number, columns: number) {
    this.rows = rows
    this.columns = columns
    this._cells = Array.from({ length: rows }, () =>
      Array.from({ length: columns }, () => ({ ...EMPTY_CELL, style: {} })),
    )
  }

  /** Get a cell (returns empty cell if out of bounds). */
  getCell(row: number, col: number): Cell {
    return this._cells[row]?.[col] ?? EMPTY_CELL
  }

  /** Set a cell value. */
  setCell(row: number, col: number, cell: Partial<Cell>): void {
    const existing = this._cells[row]?.[col]
    if (!existing) return
    Object.assign(existing, cell)
  }

  /** Write a character at (row, col) with a style, returning the next col. */
  writeChar(row: number, col: number, char: string, style: CellStyle, href?: string): number {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.columns) return col + 1
    const width = getCharWidth(char)
    this._cells[row]![col] = { char, style, width: width as 1 | 2 | 0, href }
    if (width === 2 && col + 1 < this.columns) {
      this._cells[row]![col + 1] = { char: '', style, width: 0, href }
    }
    return col + width
  }

  /** Clear a rectangular region. */
  clearRegion(row: number, col: number, endRow: number, endCol: number): void {
    for (let r = row; r < Math.min(endRow, this.rows); r++) {
      for (let c = col; c < Math.min(endCol, this.columns); c++) {
        this._cells[r]![c] = { char: ' ', style: {}, width: 1 }
      }
    }
  }

  /** Clear the entire screen. */
  clear(): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.columns; c++) {
        this._cells[r]![c] = { char: ' ', style: {}, width: 1 }
      }
    }
  }

  /** Render a row to an ANSI string. */
  renderRow(row: number): string {
    if (row < 0 || row >= this.rows) return ''
    let out = ''
    let prevStyle: CellStyle = {}

    for (let c = 0; c < this.columns; c++) {
      const cell = this._cells[row]![c]!
      if (cell.width === 0) continue // wide char continuation
      const sOpen = openCellStyle(cell.style, prevStyle)
      if (sOpen) out += sOpen
      out += cell.char || ' '
      prevStyle = cell.style
    }

    if (out.endsWith('\x1b[0m')) return out
    if (out !== ' '.repeat(this.columns)) out += '\x1b[0m'
    return out
  }

  /** Extract text content of a row (no ANSI). */
  rowText(row: number): string {
    if (row < 0 || row >= this.rows) return ''
    return this._cells[row]!.map(c => c.width === 0 ? '' : (c.char || ' ')).join('')
  }

  /** Extract text content of a region. */
  extractText(startRow: number, startCol: number, endRow: number, endCol: number): string {
    const lines: string[] = []
    for (let r = startRow; r <= Math.min(endRow, this.rows - 1); r++) {
      const cs = r === startRow ? startCol : 0
      const ce = r === endRow   ? endCol   : this.columns
      let line = ''
      for (let c = cs; c < Math.min(ce, this.columns); c++) {
        const cell = this._cells[r]![c]!
        if (cell.width !== 0) line += cell.char || ' '
      }
      lines.push(line.trimEnd())
    }
    return lines.join('\n')
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ESC = '\x1b['

/** Emit only the SGR codes that differ from prevStyle. */
function openCellStyle(style: CellStyle, prev: CellStyle): string {
  let seq = ''
  if (style.bold !== prev.bold)           seq += style.bold           ? `${ESC}1m` : `${ESC}22m`
  if (style.dim !== prev.dim)             seq += style.dim            ? `${ESC}2m` : `${ESC}22m`
  if (style.italic !== prev.italic)       seq += style.italic         ? `${ESC}3m` : `${ESC}23m`
  if (style.underline !== prev.underline) seq += style.underline      ? `${ESC}4m` : `${ESC}24m`
  if (style.inverse !== prev.inverse)     seq += style.inverse        ? `${ESC}7m` : `${ESC}27m`
  if (style.color !== prev.color) {
    seq += style.color ? namedColor(style.color, false) : `${ESC}39m`
  }
  if (style.backgroundColor !== prev.backgroundColor) {
    seq += style.backgroundColor ? namedColor(style.backgroundColor, true) : `${ESC}49m`
  }
  return seq
}

const NAMED_FG: Record<string, number> = {
  black:30, red:31, green:32, yellow:33, blue:34, magenta:35, cyan:36, white:37,
  gray:90, grey:90, blackBright:90, redBright:91, greenBright:92,
  yellowBright:93, blueBright:94, magentaBright:95, cyanBright:96, whiteBright:97,
}

function namedColor(color: string, bg: boolean): string {
  const offset = bg ? 10 : 0
  if (color.startsWith('#') && color.length === 7) {
    const r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16)
    return bg ? `${ESC}48;2;${r};${g};${b}m` : `${ESC}38;2;${r};${g};${b}m`
  }
  const code = NAMED_FG[color]
  return code != null ? `${ESC}${code + offset}m` : ''
}

/** Approximate Unicode char width (1 for most, 2 for CJK wide chars). */
export function getCharWidth(char: string): number {
  if (!char) return 0
  const code = char.codePointAt(0) ?? 0
  // CJK ranges (wide = 2 cols)
  if (
    (code >= 0x1100 && code <= 0x115f) ||  // Hangul Jamo
    (code >= 0x2e80 && code <= 0x303e) ||  // CJK Radicals
    (code >= 0x3041 && code <= 0x33bd) ||  // Hiragana/Katakana/etc
    (code >= 0x33ff && code <= 0xa4c6) ||
    (code >= 0xa960 && code <= 0xa97c) ||
    (code >= 0xac00 && code <= 0xd7a3) ||  // Hangul Syllables
    (code >= 0xf900 && code <= 0xfaff) ||  // CJK Compat
    (code >= 0xfe10 && code <= 0xfe19) ||
    (code >= 0xfe30 && code <= 0xfe52) ||
    (code >= 0xfe54 && code <= 0xfe66) ||
    (code >= 0xfe68 && code <= 0xfe6b) ||
    (code >= 0xff01 && code <= 0xff60) ||  // Fullwidth Forms
    (code >= 0xffe0 && code <= 0xffe6) ||
    (code >= 0x1b000 && code <= 0x1b001) ||
    (code >= 0x1f004 && code <= 0x1f0cf) ||
    (code >= 0x1f18e && code <= 0x1f9ff) || // Emoji
    (code >= 0x20000 && code <= 0x2fffd) || // CJK Extension B-F
    (code >= 0x30000 && code <= 0x3fffd)
  ) return 2
  return 1
}
