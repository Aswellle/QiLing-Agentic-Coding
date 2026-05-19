/**
 * ANSI-aware string slicing — adapted from CC's utils/sliceAnsi.ts
 *
 * Slices a string by display columns, correctly handling ANSI escape codes,
 * OSC 8 hyperlinks (via @alcalzone/ansi-tokenize), and CJK wide characters.
 *
 * Unlike the `slice-ansi` package, this handles hyperlinks correctly because
 * ansi-tokenize tokenizes them as structured entities, not raw bytes.
 */

import {
  type AnsiCode,
  ansiCodesToString,
  reduceAnsiCodes,
  tokenize,
  undoAnsiCodes,
} from '@alcalzone/ansi-tokenize'
import { stringWidth } from '../ink/stringWidth.js'

function isEndCode(code: AnsiCode): boolean {
  return code.code === code.endCode
}

function filterStartCodes(codes: AnsiCode[]): AnsiCode[] {
  return codes.filter(c => !isEndCode(c))
}

export default function sliceAnsi(str: string, start: number, end?: number): string {
  const tokens = tokenize(str)
  let activeCodes: AnsiCode[] = []
  let position = 0
  let result = ''
  let include = false

  for (const token of tokens) {
    const width = token.type === 'ansi' ? 0 : token.fullWidth ? 2 : stringWidth(token.value)

    if (end !== undefined && position >= end) {
      if (token.type === 'ansi' || width > 0 || !include) break
    }

    if (token.type === 'ansi') {
      activeCodes.push(token)
      if (include) result += token.code
    } else {
      if (!include && position >= start) {
        if (start > 0 && width === 0) continue
        include = true
        activeCodes = filterStartCodes(reduceAnsiCodes(activeCodes))
        result = ansiCodesToString(activeCodes)
      }

      if (include) result += token.value
      position += width
    }
  }

  const activeStartCodes = filterStartCodes(reduceAnsiCodes(activeCodes))
  result += ansiCodesToString(undoAnsiCodes(activeStartCodes))
  return result
}
