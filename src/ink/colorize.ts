/**
 * colorize — adapted from CC's ink/colorize.ts
 *
 * Converts Ink style objects (color, bgColor, bold, italic, …) into
 * ANSI SGR escape sequences. Used by render-node-to-output when writing
 * styled text into the screen buffer.
 *
 * QiLing: implements the subset of styles used in Ink 5's StyleConfig
 * (colors 0-255, truecolor RGB, bold, dim, italic, underline, inverse,
 * strikethrough, overline). Additional ansi256/truecolor paths added.
 */

/** A style descriptor matching Ink 5's Styles type subset */
export type StyleConfig = {
  color?: string | number
  backgroundColor?: string | number
  bold?: boolean
  dim?: boolean
  italic?: boolean
  underline?: boolean
  inverse?: boolean
  strikethrough?: boolean
  overline?: boolean
}

const ESC = '\x1b['
const RESET = `${ESC}0m`

/** Map named colors to ANSI color codes (30-37 FG, 90-97 bright FG) */
const NAMED_FG: Record<string, number> = {
  black: 30, red: 31, green: 32, yellow: 33,
  blue: 34, magenta: 35, cyan: 36, white: 37,
  blackBright: 90, gray: 90, grey: 90,
  redBright: 91, greenBright: 92, yellowBright: 93,
  blueBright: 94, magentaBright: 95, cyanBright: 96, whiteBright: 97,
}

const NAMED_BG: Record<string, number> = {
  black: 40, red: 41, green: 42, yellow: 43,
  blue: 44, magenta: 45, cyan: 46, white: 47,
  blackBright: 100, gray: 100, grey: 100,
  redBright: 101, greenBright: 102, yellowBright: 103,
  blueBright: 104, magentaBright: 105, cyanBright: 106, whiteBright: 107,
}

function colorCode(color: string | number, bg: boolean): string {
  if (typeof color === 'number') {
    // ansi256
    return bg ? `${ESC}48;5;${color}m` : `${ESC}38;5;${color}m`
  }
  // hex #rrggbb
  if (color.startsWith('#') && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    return bg ? `${ESC}48;2;${r};${g};${b}m` : `${ESC}38;2;${r};${g};${b}m`
  }
  // rgb(r,g,b)
  const rgb = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)
  if (rgb) {
    return bg
      ? `${ESC}48;2;${rgb[1]};${rgb[2]};${rgb[3]}m`
      : `${ESC}38;2;${rgb[1]};${rgb[2]};${rgb[3]}m`
  }
  // named
  const table = bg ? NAMED_BG : NAMED_FG
  const code = table[color]
  return code != null ? `${ESC}${code}m` : ''
}

/**
 * Convert a StyleConfig into an ANSI SGR open sequence.
 * Pair with `closeStyle()` to reset.
 */
export function openStyle(style: StyleConfig): string {
  let seq = ''
  if (style.bold)          seq += `${ESC}1m`
  if (style.dim)           seq += `${ESC}2m`
  if (style.italic)        seq += `${ESC}3m`
  if (style.underline)     seq += `${ESC}4m`
  if (style.inverse)       seq += `${ESC}7m`
  if (style.strikethrough) seq += `${ESC}9m`
  if (style.overline)      seq += `${ESC}53m`
  if (style.color != null)           seq += colorCode(style.color, false)
  if (style.backgroundColor != null) seq += colorCode(style.backgroundColor, true)
  return seq
}

/** Close a styled region with a full SGR reset. */
export function closeStyle(_style: StyleConfig): string {
  return RESET
}

/** Wrap text with open+close style sequences. */
export function colorize(text: string, style: StyleConfig): string {
  const open = openStyle(style)
  if (!open) return text
  return `${open}${text}${RESET}`
}

/** True if the style object contains any active style directives. */
export function hasStyle(style: StyleConfig): boolean {
  return !!(
    style.bold || style.dim || style.italic || style.underline ||
    style.inverse || style.strikethrough || style.overline ||
    style.color != null || style.backgroundColor != null
  )
}
