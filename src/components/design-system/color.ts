/**
 * Theme-aware color helper — adapted from CC's components/design-system/color.ts
 *
 * Returns a function that applies the named theme color to text.
 * Supports raw color values (#hex, rgb(), ansi:) bypassing theme lookup.
 *
 * @example
 * const dim = color('text', theme)
 * const warning = color('warning', theme)
 * process.stdout.write(warning('⚠ Something went wrong'))
 */

import chalk from 'chalk'
import type { ThemeName } from '../../utils/theme.js'
import { getTheme } from '../../utils/theme.js'

export function color(
  c: string | undefined,
  theme: ThemeName,
): (text: string) => string {
  if (!c) return (t: string) => t

  // Raw color values bypass theme lookup
  if (
    c.startsWith('#') ||
    c.startsWith('rgb(') ||
    c.startsWith('ansi256(') ||
    c.startsWith('ansi:')
  ) {
    return (text: string) => chalk.hex(c.startsWith('#') ? c : '#ffffff')(text)
  }

  // Theme key lookup
  const resolved = getTheme(theme)[c as keyof ReturnType<typeof getTheme>]
  if (!resolved) return (t: string) => t

  try {
    return (text: string) => chalk.hex(resolved)(text)
  } catch {
    return (t: string) => t
  }
}
