/**
 * render-border — adapted from CC's ink/render-border.ts
 *
 * Renders Unicode border characters for Ink Box borders into a string
 * matrix. Supports single, double, round, bold, classic, and custom
 * border styles.
 *
 * QiLing: full implementation — borders are pure string manipulation
 * with no dependency on screen.ts.
 */

export type BorderStyle =
  | 'single'
  | 'double'
  | 'round'
  | 'bold'
  | 'singleDouble'
  | 'doubleSingle'
  | 'classic'
  | 'arrow'

export type BorderChars = {
  topLeft: string
  top: string
  topRight: string
  left: string
  right: string
  bottomLeft: string
  bottom: string
  bottomRight: string
}

export const BORDER_STYLES: Record<BorderStyle, BorderChars> = {
  single:       { topLeft: '┌', top: '─', topRight: '┐', left: '│', right: '│', bottomLeft: '└', bottom: '─', bottomRight: '┘' },
  double:       { topLeft: '╔', top: '═', topRight: '╗', left: '║', right: '║', bottomLeft: '╚', bottom: '═', bottomRight: '╝' },
  round:        { topLeft: '╭', top: '─', topRight: '╮', left: '│', right: '│', bottomLeft: '╰', bottom: '─', bottomRight: '╯' },
  bold:         { topLeft: '┏', top: '━', topRight: '┓', left: '┃', right: '┃', bottomLeft: '┗', bottom: '━', bottomRight: '┛' },
  singleDouble: { topLeft: '╓', top: '─', topRight: '╖', left: '║', right: '║', bottomLeft: '╙', bottom: '─', bottomRight: '╜' },
  doubleSingle: { topLeft: '╒', top: '═', topRight: '╕', left: '│', right: '│', bottomLeft: '╘', bottom: '═', bottomRight: '╛' },
  classic:      { topLeft: '+', top: '-', topRight: '+', left: '|', right: '|', bottomLeft: '+', bottom: '-', bottomRight: '+' },
  arrow:        { topLeft: '↘', top: '↓', topRight: '↙', left: '→', right: '←', bottomLeft: '↗', bottom: '↑', bottomRight: '↖' },
}

export type BorderOptions = {
  style: BorderStyle | BorderChars
  width: number
  height: number
  /** Optional ANSI color prefix for borders */
  color?: string
}

/**
 * Render a border as an array of strings, one per row.
 * Each string represents a full row including the border characters.
 * Inner content is empty (spaces); callers overlay the content.
 */
export function renderBorder({ style, width, height, color }: BorderOptions): string[] {
  const chars = typeof style === 'string' ? BORDER_STYLES[style] : style
  const c = color ?? ''
  const reset = color ? '\x1b[0m' : ''
  const rows: string[] = []

  const hLine = chars.top.repeat(Math.max(0, width - 2))
  const hLineBot = chars.bottom.repeat(Math.max(0, width - 2))
  const inner = ' '.repeat(Math.max(0, width - 2))

  // top row
  rows.push(`${c}${chars.topLeft}${hLine}${chars.topRight}${reset}`)
  // inner rows
  for (let r = 0; r < height - 2; r++) {
    rows.push(`${c}${chars.left}${reset}${inner}${c}${chars.right}${reset}`)
  }
  // bottom row
  if (height > 1) {
    rows.push(`${c}${chars.bottomLeft}${hLineBot}${chars.bottomRight}${reset}`)
  }

  return rows
}

/**
 * Return only the border character for a given edge position.
 * Used by render-node-to-output for per-cell border overlaying.
 */
export function getBorderChar(
  chars: BorderChars,
  edge: 'top' | 'bottom' | 'left' | 'right' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight',
): string {
  return chars[edge]
}
