/**
 * Tab expansion — adapted from CC's ink/tabstops.ts
 *
 * Expands tab characters (\t) to spaces at 8-column intervals (POSIX default,
 * matches Ghostty's Tabstops.zig). ANSI-aware via createTokenizer.
 */

import { stringWidth } from './stringWidth.js'
import { createTokenizer } from './termio/tokenize.js'

const DEFAULT_TAB_INTERVAL = 8

export function expandTabs(text: string, interval = DEFAULT_TAB_INTERVAL): string {
  if (!text.includes('\t')) return text

  const tokenizer = createTokenizer()
  const tokens = tokenizer.feed(text)
  tokens.push(...tokenizer.flush())

  let result = ''
  let column = 0

  for (const token of tokens) {
    if (token.type === 'sequence') {
      result += token.value
    } else {
      for (const part of token.value.split(/(\t|\n)/)) {
        if (part === '\t') {
          const spaces = interval - (column % interval)
          result += ' '.repeat(spaces); column += spaces
        } else if (part === '\n') {
          result += part; column = 0
        } else {
          result += part; column += stringWidth(part)
        }
      }
    }
  }
  return result
}
