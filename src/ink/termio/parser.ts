/**
 * ANSI Parser — adapted from CC's ink/termio/parser.ts
 *
 * Streaming semantic ANSI parser: processes terminal output and produces
 * structured Actions (text, cursor moves, erases, scrolls, modes, links, etc.)
 * Maintains style state across feed() calls.
 */

import { getGraphemeSegmenter } from '../../utils/intl.js'
import { C0 } from './ansi.js'
import { CSI, CURSOR_STYLES, ERASE_DISPLAY, ERASE_LINE_REGION } from './csi.js'
import { DEC } from './dec.js'
import { parseEsc } from './esc.js'
import { parseOSC } from './osc.js'
import { applySGR } from './sgr.js'
import { createTokenizer, type Token, type Tokenizer } from './tokenize.js'
import type { Action, Grapheme, TextStyle } from './types.js'
import { defaultStyle } from './types.js'

function isEmoji(cp: number): boolean {
  return (cp >= 0x2600 && cp <= 0x26ff) || (cp >= 0x2700 && cp <= 0x27bf) ||
    (cp >= 0x1f300 && cp <= 0x1f9ff) || (cp >= 0x1fa00 && cp <= 0x1faff) ||
    (cp >= 0x1f1e0 && cp <= 0x1f1ff)
}

function isEastAsianWide(cp: number): boolean {
  return (cp >= 0x1100 && cp <= 0x115f) || (cp >= 0x2e80 && cp <= 0x9fff) ||
    (cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe10 && cp <= 0xfe1f) || (cp >= 0xfe30 && cp <= 0xfe6f) ||
    (cp >= 0xff00 && cp <= 0xff60) || (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x20000 && cp <= 0x2fffd) || (cp >= 0x30000 && cp <= 0x3fffd)
}

function hasMultipleCodepoints(str: string): boolean {
  let count = 0
  for (const _ of str) { count++; if (count > 1) return true }
  return false
}

function graphemeWidth(g: string): 1 | 2 {
  if (hasMultipleCodepoints(g)) return 2
  const cp = g.codePointAt(0)
  if (cp === undefined) return 1
  if (isEmoji(cp) || isEastAsianWide(cp)) return 2
  return 1
}

function* segmentGraphemes(str: string): Generator<Grapheme> {
  for (const { segment } of getGraphemeSegmenter().segment(str)) {
    yield { value: segment, width: graphemeWidth(segment) }
  }
}

function parseCSIParams(paramStr: string): number[] {
  if (paramStr === '') return []
  return paramStr.split(/[;:]/).map(s => (s === '' ? 0 : parseInt(s, 10)))
}

function parseCSISeq(rawSequence: string): Action | null {
  const inner = rawSequence.slice(2)
  if (inner.length === 0) return null

  const finalByte = inner.charCodeAt(inner.length - 1)
  const beforeFinal = inner.slice(0, -1)

  let privateMode = ''
  let paramStr = beforeFinal
  let intermediate = ''

  if (beforeFinal.length > 0 && '?>='.includes(beforeFinal[0]!)) {
    privateMode = beforeFinal[0]!
    paramStr = beforeFinal.slice(1)
  }

  const intermediateMatch = paramStr.match(/([^0-9;:]+)$/)
  if (intermediateMatch) {
    intermediate = intermediateMatch[1]!
    paramStr = paramStr.slice(0, -intermediate.length)
  }

  const params = parseCSIParams(paramStr)
  const p0 = params[0] ?? 1
  const p1 = params[1] ?? 1

  if (finalByte === CSI.SGR && privateMode === '') return { type: 'sgr', params: paramStr }

  if (finalByte === CSI.CUU) return { type: 'cursor', action: { type: 'move', direction: 'up', count: p0 } }
  if (finalByte === CSI.CUD) return { type: 'cursor', action: { type: 'move', direction: 'down', count: p0 } }
  if (finalByte === CSI.CUF) return { type: 'cursor', action: { type: 'move', direction: 'forward', count: p0 } }
  if (finalByte === CSI.CUB) return { type: 'cursor', action: { type: 'move', direction: 'back', count: p0 } }
  if (finalByte === CSI.CNL) return { type: 'cursor', action: { type: 'nextLine', count: p0 } }
  if (finalByte === CSI.CPL) return { type: 'cursor', action: { type: 'prevLine', count: p0 } }
  if (finalByte === CSI.CHA) return { type: 'cursor', action: { type: 'column', col: p0 } }
  if (finalByte === CSI.CUP || finalByte === CSI.HVP) return { type: 'cursor', action: { type: 'position', row: p0, col: p1 } }
  if (finalByte === CSI.VPA) return { type: 'cursor', action: { type: 'row', row: p0 } }

  if (finalByte === CSI.ED) return { type: 'erase', action: { type: 'display', region: ERASE_DISPLAY[params[0] ?? 0] ?? 'toEnd' } }
  if (finalByte === CSI.EL) return { type: 'erase', action: { type: 'line', region: ERASE_LINE_REGION[params[0] ?? 0] ?? 'toEnd' } }
  if (finalByte === CSI.ECH) return { type: 'erase', action: { type: 'chars', count: p0 } }

  if (finalByte === CSI.SU) return { type: 'scroll', action: { type: 'up', count: p0 } }
  if (finalByte === CSI.SD) return { type: 'scroll', action: { type: 'down', count: p0 } }
  if (finalByte === CSI.DECSTBM) return { type: 'scroll', action: { type: 'setRegion', top: p0, bottom: p1 } }

  if (finalByte === CSI.SCOSC) return { type: 'cursor', action: { type: 'save' } }
  if (finalByte === CSI.SCORC) return { type: 'cursor', action: { type: 'restore' } }

  if (finalByte === CSI.DECSCUSR && intermediate === ' ') {
    const styleInfo = CURSOR_STYLES[p0] ?? CURSOR_STYLES[0]!
    return { type: 'cursor', action: { type: 'style', ...styleInfo } }
  }

  if (privateMode === '?' && (finalByte === CSI.SM || finalByte === CSI.RM)) {
    const enabled = finalByte === CSI.SM
    if (p0 === DEC.CURSOR_VISIBLE) return { type: 'cursor', action: enabled ? { type: 'show' } : { type: 'hide' } }
    if (p0 === DEC.ALT_SCREEN_CLEAR || p0 === DEC.ALT_SCREEN) return { type: 'mode', action: { type: 'alternateScreen', enabled } }
    if (p0 === DEC.BRACKETED_PASTE) return { type: 'mode', action: { type: 'bracketedPaste', enabled } }
    if (p0 === DEC.MOUSE_NORMAL) return { type: 'mode', action: { type: 'mouseTracking', mode: enabled ? 'normal' : 'off' } }
    if (p0 === DEC.MOUSE_BUTTON) return { type: 'mode', action: { type: 'mouseTracking', mode: enabled ? 'button' : 'off' } }
    if (p0 === DEC.MOUSE_ANY) return { type: 'mode', action: { type: 'mouseTracking', mode: enabled ? 'any' : 'off' } }
    if (p0 === DEC.FOCUS_EVENTS) return { type: 'mode', action: { type: 'focusEvents', enabled } }
  }

  return { type: 'unknown', sequence: rawSequence }
}

function identifySequence(seq: string): 'csi' | 'osc' | 'esc' | 'ss3' | 'unknown' {
  if (seq.length < 2 || seq.charCodeAt(0) !== C0.ESC) return 'unknown'
  const second = seq.charCodeAt(1)
  if (second === 0x5b) return 'csi'
  if (second === 0x5d) return 'osc'
  if (second === 0x4f) return 'ss3'
  return 'esc'
}

export class Parser {
  private tokenizer: Tokenizer = createTokenizer()
  style: TextStyle = defaultStyle()
  inLink = false
  linkUrl: string | undefined

  reset(): void {
    this.tokenizer.reset()
    this.style = defaultStyle()
    this.inLink = false
    this.linkUrl = undefined
  }

  feed(input: string): Action[] {
    const tokens = this.tokenizer.feed(input)
    const actions: Action[] = []
    for (const token of tokens) actions.push(...this.processToken(token))
    return actions
  }

  private processToken(token: Token): Action[] {
    return token.type === 'text' ? this.processText(token.value) : this.processSequence(token.value)
  }

  private processText(text: string): Action[] {
    const actions: Action[] = []
    let current = ''
    for (const char of text) {
      if (char.charCodeAt(0) === C0.BEL) {
        if (current) {
          const graphemes = [...segmentGraphemes(current)]
          if (graphemes.length > 0) actions.push({ type: 'text', graphemes, style: { ...this.style } })
          current = ''
        }
        actions.push({ type: 'bell' })
      } else {
        current += char
      }
    }
    if (current) {
      const graphemes = [...segmentGraphemes(current)]
      if (graphemes.length > 0) actions.push({ type: 'text', graphemes, style: { ...this.style } })
    }
    return actions
  }

  private processSequence(seq: string): Action[] {
    const seqType = identifySequence(seq)
    switch (seqType) {
      case 'csi': {
        const action = parseCSISeq(seq)
        if (!action) return []
        if (action.type === 'sgr') { this.style = applySGR(action.params, this.style); return [] }
        return [action]
      }
      case 'osc': {
        let content = seq.slice(2)
        if (content.endsWith('\x07')) content = content.slice(0, -1)
        else if (content.endsWith('\x1b\\')) content = content.slice(0, -2)
        const action = parseOSC(content)
        if (action) {
          if (action.type === 'link') {
            if (action.action.type === 'start') { this.inLink = true; this.linkUrl = action.action.url }
            else { this.inLink = false; this.linkUrl = undefined }
          }
          return [action]
        }
        return []
      }
      case 'esc': {
        const action = parseEsc(seq.slice(1))
        return action ? [action] : []
      }
      default:
        return [{ type: 'unknown', sequence: seq }]
    }
  }
}
