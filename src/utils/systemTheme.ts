/**
 * Terminal dark/light mode detection — adapted from CC's utils/systemTheme.ts
 *
 * Detects theme based on the terminal's actual background color (via OSC 11
 * query) rather than OS appearance — a dark terminal on a light-mode OS
 * should still resolve to 'dark'.
 *
 * Cache strategy:
 * 1. Seed from $COLORFGBG (synchronous, set by some terminals at launch)
 * 2. Update when OSC 11 response arrives (async, via setCachedSystemTheme)
 *
 * Used by theme.ts resolveTheme('auto') and the StatusBar color picker.
 */

import type { ThemeName, ThemeSetting } from './theme.js'

export type SystemTheme = 'dark' | 'light'

let cachedSystemTheme: SystemTheme | undefined

/**
 * Get the current terminal theme (cached). Falls back to 'dark' if unknown.
 */
export function getSystemThemeName(): SystemTheme {
  if (cachedSystemTheme === undefined) {
    cachedSystemTheme = detectFromColorFgBg() ?? 'dark'
  }
  return cachedSystemTheme
}

/**
 * Update the cached terminal theme. Called when OSC 11 query returns.
 */
export function setCachedSystemTheme(theme: SystemTheme): void {
  cachedSystemTheme = theme
}

/**
 * Resolve a ThemeSetting (which may be 'auto') to a concrete ThemeName.
 */
export function resolveThemeSetting(setting: ThemeSetting): ThemeName {
  if (setting === 'auto') return getSystemThemeName()
  return setting
}

/**
 * Parse an OSC color response string into a theme.
 *
 * Accepts XParseColor formats:
 * - `rgb:R/G/B` — each 1–4 hex digits (xterm, iTerm2, Terminal.app, etc.)
 * - `#RRGGBB` / `#RRRRGGGGBBBB` — rare, but handled
 *
 * Returns undefined for unrecognized formats.
 */
export function themeFromOscColor(data: string): SystemTheme | undefined {
  const rgb = parseOscRgb(data)
  if (!rgb) return undefined
  // ITU-R BT.709 relative luminance. Midpoint: > 0.5 is light.
  const luminance = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b
  return luminance > 0.5 ? 'light' : 'dark'
}

type Rgb = { r: number; g: number; b: number }

function parseOscRgb(data: string): Rgb | undefined {
  // rgb:RRRR/GGGG/BBBB — each component 1–4 hex digits; optional alpha
  const rgbMatch = /^rgba?:([0-9a-f]{1,4})\/([0-9a-f]{1,4})\/([0-9a-f]{1,4})/i.exec(data)
  if (rgbMatch) {
    return {
      r: hexComponent(rgbMatch[1]!),
      g: hexComponent(rgbMatch[2]!),
      b: hexComponent(rgbMatch[3]!),
    }
  }
  // #RRGGBB or #RRRRGGGGBBBB — split into three equal hex runs
  const hashMatch = /^#([0-9a-f]+)$/i.exec(data)
  if (hashMatch && hashMatch[1]!.length % 3 === 0) {
    const hex = hashMatch[1]!
    const n = hex.length / 3
    return {
      r: hexComponent(hex.slice(0, n)),
      g: hexComponent(hex.slice(n, 2 * n)),
      b: hexComponent(hex.slice(2 * n)),
    }
  }
  return undefined
}

/** Normalize a 1–4 digit hex component to [0, 1]. */
function hexComponent(hex: string): number {
  const max = 16 ** hex.length - 1
  return parseInt(hex, 16) / max
}

/**
 * Read $COLORFGBG for a synchronous initial dark/light guess.
 * Format: `fg;bg` or `fg;other;bg` (ANSI color indices).
 * rxvt convention: bg 0–6 or 8 → dark; 7 and 9–15 → light.
 * Only set by some terminals (rxvt-family, Konsole, iTerm2 with option).
 */
function detectFromColorFgBg(): SystemTheme | undefined {
  const colorfgbg = process.env.COLORFGBG
  if (!colorfgbg) return undefined
  const parts = colorfgbg.split(';')
  const bg = parts[parts.length - 1]
  if (!bg) return undefined
  const bgNum = Number(bg)
  if (!Number.isInteger(bgNum) || bgNum < 0 || bgNum > 15) return undefined
  // 0–6 and 8 are dark ANSI colors; 7 (white) and 9–15 (bright) are light
  return bgNum <= 6 || bgNum === 8 ? 'dark' : 'light'
}
