/**
 * ANSI-aware text highlight segmenter — adapted from CC's utils/textHighlighting.ts
 *
 * Splits text into segments that can be independently styled by highlight colors.
 * Uses @alcalzone/ansi-tokenize to correctly track positions through ANSI codes.
 * Used by search/selection highlighting in the conversation view.
 */

import {
  type AnsiCode,
  ansiCodesToString,
  reduceAnsiCodes,
  type Token,
  tokenize,
  undoAnsiCodes,
} from '@alcalzone/ansi-tokenize'
import type { Theme } from './theme.js'

export type TextHighlight = {
  start: number
  end: number
  color: keyof Theme | undefined
  dimColor?: boolean
  inverse?: boolean
  shimmerColor?: keyof Theme
  priority: number
}

export type TextSegment = {
  text: string
  start: number
  highlight?: TextHighlight
}

export function segmentTextByHighlights(text: string, highlights: TextHighlight[]): TextSegment[] {
  if (highlights.length === 0) return [{ text, start: 0 }]

  const sorted = [...highlights].sort((a, b) =>
    a.start !== b.start ? a.start - b.start : b.priority - a.priority,
  )

  const resolved: TextHighlight[] = []
  const used: Array<{ start: number; end: number }> = []

  for (const h of sorted) {
    if (h.start === h.end) continue
    const overlaps = used.some(r =>
      (h.start >= r.start && h.start < r.end) ||
      (h.end > r.start && h.end <= r.end) ||
      (h.start <= r.start && h.end >= r.end),
    )
    if (!overlaps) { resolved.push(h); used.push({ start: h.start, end: h.end }) }
  }

  return new HighlightSegmenter(text).segment(resolved)
}

class HighlightSegmenter {
  private readonly tokens: Token[]
  private visiblePos = 0
  private stringPos = 0
  private tokenIdx = 0
  private charIdx = 0
  private codes: AnsiCode[] = []

  constructor(private readonly text: string) {
    this.tokens = tokenize(text)
  }

  segment(highlights: TextHighlight[]): TextSegment[] {
    const segments: TextSegment[] = []
    for (const h of highlights) {
      const before = this.segmentTo(h.start)
      if (before) segments.push(before)
      const highlighted = this.segmentTo(h.end)
      if (highlighted) { highlighted.highlight = h; segments.push(highlighted) }
    }
    const after = this.segmentTo(Infinity)
    if (after) segments.push(after)
    return segments
  }

  private segmentTo(target: number): TextSegment | null {
    if (this.tokenIdx >= this.tokens.length || target <= this.visiblePos) return null

    const visibleStart = this.visiblePos

    while (this.tokenIdx < this.tokens.length) {
      const t = this.tokens[this.tokenIdx]!
      if (t.type !== 'ansi') break
      this.codes.push(t); this.stringPos += t.code.length; this.tokenIdx++
    }

    const stringStart = this.stringPos
    const codesStart = [...this.codes]

    while (this.visiblePos < target && this.tokenIdx < this.tokens.length) {
      const t = this.tokens[this.tokenIdx]!
      if (t.type === 'ansi') {
        this.codes.push(t); this.stringPos += t.code.length; this.tokenIdx++
      } else {
        const needed = target - this.visiblePos
        const avail = t.value.length - this.charIdx
        const take = Math.min(needed, avail)
        this.stringPos += take; this.visiblePos += take; this.charIdx += take
        if (this.charIdx >= t.value.length) { this.tokenIdx++; this.charIdx = 0 }
      }
    }

    if (this.stringPos === stringStart) return null

    const prefix = ansiCodesToString(reduceCodes(codesStart))
    const suffix = ansiCodesToString(undoAnsiCodes(reduceCodes(this.codes)))
    this.codes = reduceCodes(this.codes)

    return { text: prefix + this.text.substring(stringStart, this.stringPos) + suffix, start: visibleStart }
  }
}

function reduceCodes(codes: AnsiCode[]): AnsiCode[] {
  return reduceAnsiCodes(codes).filter(c => c.code !== c.endCode)
}
