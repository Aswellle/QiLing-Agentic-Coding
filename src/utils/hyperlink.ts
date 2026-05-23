/**
 * OSC 8 terminal hyperlink support — ported from CC's utils/hyperlink.ts
 *
 * Creates clickable hyperlinks in terminals that support OSC 8.
 * Falls back to plain URL text when not supported.
 */

import chalk from 'chalk'
import { supportsHyperlinks } from '../ink/supports-hyperlinks.js'

// OSC 8 hyperlink escape sequences (BEL terminator for broader compat)
export const OSC8_START = '\x1b]8;;'
export const OSC8_END = '\x07'

// FROM CC: HyperlinkOptions type
export type HyperlinkOptions = {
  supportsHyperlinks?: boolean
}

/**
 * Create a clickable OSC 8 hyperlink.
 * Falls back to plain URL if terminal doesn't support hyperlinks.
 * Link text is rendered in blue (chalk.blue) when hyperlinks are supported.
 */
export function createHyperlink(
  url: string,
  content?: string,
  options?: HyperlinkOptions,
): string {
  const hasSupport = options?.supportsHyperlinks ?? supportsHyperlinks()
  if (!hasSupport) return url
  const displayText = content ?? url
  const coloredText = chalk.blue(displayText)
  return `${OSC8_START}${url}${OSC8_END}${coloredText}${OSC8_START}${OSC8_END}`
}
