/**
 * Unicode-aware cursor for multi-line text editing — ported from CC's utils/Cursor.ts
 *
 * Adaptations from CC:
 * - stringWidth: CC internal Ink → 'string-width' npm package
 * - wrapAnsi:    CC internal Ink → 'wrap-ansi' npm package
 * - snapOutOfImageRef / imageRef*: kept as no-ops (QiLing has no image chips in input)
 * - Kill ring: kept (Ctrl+U/K support)
 */

import stringWidth from 'string-width'
import wrapAnsi from 'wrap-ansi'
import { firstGrapheme, getGraphemeSegmenter, getWordSegmenter } from './intl'

// ─── Kill ring ────────────────────────────────────────────────────────────────

const KILL_RING_MAX_SIZE = 10
let killRing: string[] = []
let killRingIndex = 0
let lastActionWasKill = false
let lastYankStart = 0
let lastYankLength = 0
let lastActionWasYank = false

export function pushToKillRing(text: string, direction: 'prepend' | 'append' = 'append'): void {
  if (text.length > 0) {
    if (lastActionWasKill && killRing.length > 0) {
      killRing[0] = direction === 'prepend' ? text + killRing[0] : killRing[0] + text
    } else {
      killRing.unshift(text)
      if (killRing.length > KILL_RING_MAX_SIZE) killRing.pop()
    }
    lastActionWasKill = true
    lastActionWasYank = false
  }
}
export const getLastKill = (): string => killRing[0] ?? ''
// FROM CC: getKillRingItem — access any kill ring entry by index (for Alt+Y cycling UI)
export function getKillRingItem(index: number): string {
  if (killRing.length === 0) return ''
  const normalizedIndex = ((index % killRing.length) + killRing.length) % killRing.length
  return killRing[normalizedIndex] ?? ''
}
// FROM CC: getKillRingSize
export const getKillRingSize = (): number => killRing.length
export const resetKillAccumulation = (): void => { lastActionWasKill = false }
export function recordYank(start: number, length: number): void {
  lastYankStart = start; lastYankLength = length; lastActionWasYank = true; killRingIndex = 0
}
export const canYankPop = (): boolean => lastActionWasYank && killRing.length > 1
export function yankPop(): { text: string; start: number; length: number } | null {
  if (!lastActionWasYank || killRing.length <= 1) return null
  killRingIndex = (killRingIndex + 1) % killRing.length
  return { text: killRing[killRingIndex] ?? '', start: lastYankStart, length: lastYankLength }
}
export const updateYankLength = (length: number): void => { lastYankLength = length }
export const resetYankState = (): void => { lastActionWasYank = false }
export const clearKillRing = (): void => {
  killRing = []; killRingIndex = 0; lastActionWasKill = false
  lastActionWasYank = false; lastYankStart = 0; lastYankLength = 0
}

// ─── Vim char classification ──────────────────────────────────────────────────

export const VIM_WORD_CHAR_REGEX = /^[\p{L}\p{N}\p{M}_]$/u
export const WHITESPACE_REGEX = /\s/
export const isVimWordChar = (ch: string): boolean => VIM_WORD_CHAR_REGEX.test(ch)
export const isVimWhitespace = (ch: string): boolean => WHITESPACE_REGEX.test(ch)
export const isVimPunctuation = (ch: string): boolean =>
  ch.length > 0 && !isVimWhitespace(ch) && !isVimWordChar(ch)

// ─── Types ────────────────────────────────────────────────────────────────────

type WrappedText = string[]
type Position = { line: number; column: number }

// ─── Cursor class ─────────────────────────────────────────────────────────────

export class Cursor {
  readonly offset: number
  constructor(
    readonly measuredText: MeasuredText,
    offset: number = 0,
    readonly selection: number = 0,
  ) {
    this.offset = Math.max(0, Math.min(this.text.length, offset))
  }

  static fromText(text: string, columns: number, offset = 0, selection = 0): Cursor {
    return new Cursor(new MeasuredText(text, columns - 1), offset, selection)
  }

  // ── Navigation ───────────────────────────────────────────────────────────────

  left(): Cursor {
    if (this.offset === 0) return this
    const prevOffset = this.measuredText.prevOffset(this.offset)
    return new Cursor(this.measuredText, prevOffset)
  }

  right(): Cursor {
    if (this.offset >= this.text.length) return this
    const nextOffset = this.measuredText.nextOffset(this.offset)
    return new Cursor(this.measuredText, Math.min(nextOffset, this.text.length))
  }

  up(): Cursor {
    const { line, column } = this.getPosition()
    if (line === 0) return this
    const prevLine = this.measuredText.getWrappedText()[line - 1]
    if (prevLine === undefined) return this
    const prevLineWidth = stringWidth(prevLine)
    const newOffset = this.getOffset({ line: line - 1, column: Math.min(column, prevLineWidth) })
    return new Cursor(this.measuredText, newOffset, 0)
  }

  down(): Cursor {
    const { line, column } = this.getPosition()
    if (line >= this.measuredText.lineCount - 1) return this
    const nextLine = this.measuredText.getWrappedText()[line + 1]
    if (nextLine === undefined) return this
    const nextLineWidth = stringWidth(nextLine)
    const newOffset = this.getOffset({ line: line + 1, column: Math.min(column, nextLineWidth) })
    return new Cursor(this.measuredText, newOffset, 0)
  }

  startOfLine(): Cursor {
    const { line, column } = this.getPosition()
    if (column === 0 && line > 0) {
      return new Cursor(this.measuredText, this.getOffset({ line: line - 1, column: 0 }), 0)
    }
    return new Cursor(this.measuredText, this.getOffset({ line, column: 0 }), 0)
  }

  endOfLine(): Cursor {
    const { line } = this.getPosition()
    const column = this.measuredText.getLineLength(line)
    return new Cursor(this.measuredText, this.getOffset({ line, column }), 0)
  }

  firstNonBlankInLine(): Cursor {
    const { line } = this.getPosition()
    const lineText = this.measuredText.getWrappedText()[line] || ''
    const match = lineText.match(/^\s*\S/)
    const column = match?.index ? match.index + match[0].length - 1 : 0
    return new Cursor(this.measuredText, this.getOffset({ line, column }), 0)
  }

  private findLogicalLineStart(fromOffset = this.offset): number {
    const prevNewline = this.text.lastIndexOf('\n', fromOffset - 1)
    return prevNewline === -1 ? 0 : prevNewline + 1
  }
  private findLogicalLineEnd(fromOffset = this.offset): number {
    const nextNewline = this.text.indexOf('\n', fromOffset)
    return nextNewline === -1 ? this.text.length : nextNewline
  }

  startOfLogicalLine(): Cursor {
    return new Cursor(this.measuredText, this.findLogicalLineStart(), 0)
  }
  endOfLogicalLine(): Cursor {
    return new Cursor(this.measuredText, this.findLogicalLineEnd(), 0)
  }
  firstNonBlankInLogicalLine(): Cursor {
    const start = this.findLogicalLineStart()
    const end = this.findLogicalLineEnd()
    const lineText = this.text.slice(start, end)
    const match = lineText.match(/\S/)
    return new Cursor(this.measuredText, start + (match?.index ?? 0), 0)
  }

  upLogicalLine(): Cursor {
    const start = this.findLogicalLineStart()
    if (start === 0) return new Cursor(this.measuredText, 0, 0)
    const col = this.offset - start
    const prevEnd = start - 1
    const prevStart = this.findLogicalLineStart(prevEnd)
    const clamped = Math.min(col, prevEnd - prevStart)
    return new Cursor(this.measuredText, this.measuredText.snapToGraphemeBoundary(prevStart + clamped), 0)
  }

  downLogicalLine(): Cursor {
    const start = this.findLogicalLineStart()
    const end = this.findLogicalLineEnd()
    if (end >= this.text.length) return new Cursor(this.measuredText, this.text.length, 0)
    const col = this.offset - start
    const nextStart = end + 1
    const nextEnd = this.findLogicalLineEnd(nextStart)
    const clamped = Math.min(col, nextEnd - nextStart)
    return new Cursor(this.measuredText, this.measuredText.snapToGraphemeBoundary(nextStart + clamped), 0)
  }

  startOfFirstLine(): Cursor { return new Cursor(this.measuredText, 0, 0) }

  startOfLastLine(): Cursor {
    const lastNl = this.text.lastIndexOf('\n')
    return new Cursor(this.measuredText, lastNl === -1 ? 0 : lastNl + 1, 0)
  }

  goToLine(lineNumber: number): Cursor {
    const lines = this.text.split('\n')
    const target = Math.min(Math.max(0, lineNumber - 1), lines.length - 1)
    let offset = 0
    for (let i = 0; i < target; i++) offset += (lines[i]?.length ?? 0) + 1
    return new Cursor(this.measuredText, offset, 0)
  }

  endOfFile(): Cursor { return new Cursor(this.measuredText, this.text.length, 0) }

  // ── Word motions ─────────────────────────────────────────────────────────────

  nextVimWord(): Cursor {
    const text = this.text
    let pos = this.measuredText.nextOffset(this.offset)
    if (pos >= text.length) return new Cursor(this.measuredText, text.length)
    const advance = (p: number) => this.measuredText.nextOffset(p)
    const charAt = (p: number) => text.slice(p, this.measuredText.nextOffset(p))
    const startChar = charAt(this.offset)

    if (isVimWordChar(startChar)) {
      while (pos < text.length && isVimWordChar(charAt(pos))) pos = advance(pos)
    } else if (isVimPunctuation(startChar)) {
      while (pos < text.length && isVimPunctuation(charAt(pos))) pos = advance(pos)
    }
    while (pos < text.length && isVimWhitespace(charAt(pos))) pos = advance(pos)
    return new Cursor(this.measuredText, pos)
  }

  endOfVimWord(): Cursor {
    const text = this.text
    let pos = this.measuredText.nextOffset(this.offset)
    if (pos >= text.length) return new Cursor(this.measuredText, text.length)
    const advance = (p: number) => this.measuredText.nextOffset(p)
    const charAt = (p: number) => text.slice(p, this.measuredText.nextOffset(p))

    if (isVimWhitespace(charAt(pos))) {
      while (pos < text.length && isVimWhitespace(charAt(pos))) pos = advance(pos)
    }
    if (isVimWordChar(charAt(pos))) {
      while (advance(pos) < text.length && isVimWordChar(charAt(advance(pos)))) pos = advance(pos)
    } else {
      while (advance(pos) < text.length && isVimPunctuation(charAt(advance(pos)))) pos = advance(pos)
    }
    return new Cursor(this.measuredText, pos)
  }

  prevVimWord(): Cursor {
    const text = this.text
    if (this.offset === 0) return this
    const retreat = (p: number) => this.measuredText.prevOffset(p)
    const charAt = (p: number) => text.slice(p, this.measuredText.nextOffset(p))
    let pos = retreat(this.offset)
    while (pos > 0 && isVimWhitespace(charAt(pos))) pos = retreat(pos)
    if (pos === 0 && isVimWhitespace(charAt(0))) return new Cursor(this.measuredText, 0)
    if (isVimWordChar(charAt(pos))) {
      while (pos > 0 && isVimWordChar(charAt(retreat(pos)))) pos = retreat(pos)
    } else if (isVimPunctuation(charAt(pos))) {
      while (pos > 0 && isVimPunctuation(charAt(retreat(pos)))) pos = retreat(pos)
    }
    return new Cursor(this.measuredText, pos)
  }

  nextWORD(): Cursor {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let c: Cursor = this
    while (!c.isOverWhitespace() && !c.isAtEnd()) c = c.right()
    while (c.isOverWhitespace() && !c.isAtEnd()) c = c.right()
    return c
  }
  endOfWORD(): Cursor {
    if (this.isAtEnd()) return this
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let c: Cursor = this
    const atEnd = !c.isOverWhitespace() && (c.right().isOverWhitespace() || c.right().isAtEnd())
    if (atEnd) return c.right().endOfWORD()
    if (c.isOverWhitespace()) c = c.nextWORD()
    while (!c.right().isOverWhitespace() && !c.isAtEnd()) c = c.right()
    return c
  }
  prevWORD(): Cursor {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let c: Cursor = this
    if (c.left().isOverWhitespace()) c = c.left()
    while (c.isOverWhitespace() && !c.isAtStart()) c = c.left()
    if (!c.isOverWhitespace()) {
      while (!c.left().isOverWhitespace() && !c.isAtStart()) c = c.left()
    }
    return c
  }

  // FROM CC: nextWord — Intl.Segmenter-based (handles CJK); distinct from Vim nextVimWord
  nextWord(): Cursor {
    if (this.isAtEnd()) return this
    const wordBoundaries = this.measuredText.getWordBoundaries()
    for (const boundary of wordBoundaries) {
      if (boundary.isWordLike && boundary.start > this.offset) {
        return new Cursor(this.measuredText, boundary.start)
      }
    }
    return new Cursor(this.measuredText, this.text.length)
  }

  // FROM CC: endOfWord — Intl.Segmenter-based
  endOfWord(): Cursor {
    if (this.isAtEnd()) return this
    const wordBoundaries = this.measuredText.getWordBoundaries()
    for (const boundary of wordBoundaries) {
      if (!boundary.isWordLike) continue
      if (this.offset >= boundary.start && this.offset < boundary.end - 1) {
        return new Cursor(this.measuredText, boundary.end - 1)
      }
      if (this.offset === boundary.end - 1) {
        for (const nextBoundary of wordBoundaries) {
          if (nextBoundary.isWordLike && nextBoundary.start > this.offset) {
            return new Cursor(this.measuredText, nextBoundary.end - 1)
          }
        }
        return this
      }
    }
    for (const boundary of wordBoundaries) {
      if (boundary.isWordLike && boundary.start > this.offset) {
        return new Cursor(this.measuredText, boundary.end - 1)
      }
    }
    return this
  }

  // FROM CC: prevWord — Intl.Segmenter-based
  prevWord(): Cursor {
    if (this.isAtStart()) return this
    const wordBoundaries = this.measuredText.getWordBoundaries()
    let prevWordStart: number | null = null
    for (const boundary of wordBoundaries) {
      if (!boundary.isWordLike) continue
      if (boundary.start < this.offset) {
        if (this.offset > boundary.start && this.offset <= boundary.end) {
          return new Cursor(this.measuredText, boundary.start)
        }
        prevWordStart = boundary.start
      }
    }
    if (prevWordStart !== null) return new Cursor(this.measuredText, prevWordStart)
    return new Cursor(this.measuredText, 0)
  }

  // ── Editing ──────────────────────────────────────────────────────────────────

  modifyText(end: Cursor, insertString = ''): Cursor {
    const newText = this.text.slice(0, this.offset) + insertString + this.text.slice(end.offset)
    return Cursor.fromText(newText, this.measuredText.columns + 1, this.offset + insertString.normalize('NFC').length)
  }
  insert(s: string): Cursor { return this.modifyText(this, s) }
  del(): Cursor { return this.isAtEnd() ? this : this.modifyText(this.right()) }
  backspace(): Cursor { return this.isAtStart() ? this : this.left().modifyText(this) }

  deleteToLineStart(): { cursor: Cursor; killed: string } {
    if (this.offset > 0 && this.text[this.offset - 1] === '\n') {
      return { cursor: this.left().modifyText(this), killed: '\n' }
    }
    const startCursor = this.startOfLine()
    const killed = this.text.slice(startCursor.offset, this.offset)
    return { cursor: startCursor.modifyText(this), killed }
  }
  deleteToLineEnd(): { cursor: Cursor; killed: string } {
    if (this.text[this.offset] === '\n') return { cursor: this.modifyText(this.right()), killed: '\n' }
    const endCursor = this.endOfLine()
    const killed = this.text.slice(this.offset, endCursor.offset)
    return { cursor: this.modifyText(endCursor), killed }
  }
  deleteToLogicalLineEnd(): Cursor {
    if (this.text[this.offset] === '\n') return this.modifyText(this.right())
    return this.modifyText(this.endOfLogicalLine())
  }
  deleteWordBefore(): { cursor: Cursor; killed: string } {
    if (this.isAtStart()) return { cursor: this, killed: '' }
    const prevWordCursor = new Cursor(this.measuredText, this.prevVimWord().offset)
    const killed = this.text.slice(prevWordCursor.offset, this.offset)
    return { cursor: prevWordCursor.modifyText(this), killed }
  }
  deleteWordAfter(): Cursor {
    if (this.isAtEnd()) return this
    return this.modifyText(new Cursor(this.measuredText, this.nextVimWord().offset))
  }

  /**
   * Deletes a token before the cursor if one exists.
   * Supports pasted text refs: [Pasted text #1], [Pasted text #1 +10 lines],
   * [...Truncated text #1 +10 lines...]
   *
   * Note: @mentions are NOT tokenized since users may want to correct typos
   * in file paths. Use Ctrl/Cmd+backspace for word-deletion on mentions.
   *
   * Returns null if no token found at cursor position.
   * Only triggers when cursor is at end of token (followed by whitespace or EOL).
   */
  // FROM CC: deleteTokenBefore — image-chip branch omitted (QiLing has no image chips)
  deleteTokenBefore(): Cursor | null {
    if (this.isAtStart()) {
      return null
    }

    // Only trigger if cursor is at a word boundary (whitespace or end of string after cursor)
    const charAfter = this.text[this.offset]
    if (charAfter !== undefined && !/\s/.test(charAfter)) {
      return null
    }

    const textBefore = this.text.slice(0, this.offset)

    // Check for pasted/truncated text refs: [Pasted text #1] or [...Truncated text #1 +50 lines...]
    const pasteMatch = textBefore.match(
      /(^|\s)\[(Pasted text #\d+(?: \+\d+ lines)?|Image #\d+|\.\.\.Truncated text #\d+ \+\d+ lines\.\.\.)\]$/,
    )
    if (pasteMatch) {
      const matchStart = pasteMatch.index! + pasteMatch[1]!.length
      return new Cursor(this.measuredText, matchStart).modifyText(this)
    }

    return null
  }

  // ── Image chip no-ops (QiLing has no image chips in the prompt input) ────────

  snapOutOfImageRef(offset: number, _toward: 'start' | 'end'): number { return offset }

  // ── Find character (vim f/F/t/T) ─────────────────────────────────────────────

  findCharacter(char: string, type: 'f' | 'F' | 't' | 'T', count = 1): number | null {
    const text = this.text
    const forward = type === 'f' || type === 't'
    const till = type === 't' || type === 'T'
    let found = 0
    if (forward) {
      let pos = this.measuredText.nextOffset(this.offset)
      while (pos < text.length) {
        const g = this.graphemeAt(pos)
        if (g === char) { found++; if (found === count) return till ? Math.max(this.offset, this.measuredText.prevOffset(pos)) : pos }
        pos = this.measuredText.nextOffset(pos)
      }
    } else {
      if (this.offset === 0) return null
      let pos = this.measuredText.prevOffset(this.offset)
      while (pos >= 0) {
        const g = this.graphemeAt(pos)
        if (g === char) { found++; if (found === count) return till ? Math.min(this.offset, this.measuredText.nextOffset(pos)) : pos }
        if (pos === 0) break
        pos = this.measuredText.prevOffset(pos)
      }
    }
    return null
  }

  // ── Accessors ────────────────────────────────────────────────────────────────

  get text(): string { return this.measuredText.text }
  private get columns(): number { return this.measuredText.columns + 1 }
  getPosition(): Position { return this.measuredText.getPositionFromOffset(this.offset) }
  private getOffset(position: Position): number { return this.measuredText.getOffsetFromPosition(position) }
  equals(other: Cursor): boolean { return this.offset === other.offset && this.measuredText === other.measuredText }
  isAtStart(): boolean { return this.offset === 0 }
  isAtEnd(): boolean { return this.offset >= this.text.length }
  private isOverWhitespace(): boolean { return /\s/.test(this.text[this.offset] ?? '') }
  private graphemeAt(pos: number): string {
    if (pos >= this.text.length) return ''
    return this.text.slice(pos, this.measuredText.nextOffset(pos))
  }

  // ── Viewport helpers (for multi-line display) ─────────────────────────────────

  getViewportStartLine(maxVisibleLines?: number): number {
    if (!maxVisibleLines || maxVisibleLines <= 0) return 0
    const { line } = this.getPosition()
    const allLines = this.measuredText.getWrappedText()
    if (allLines.length <= maxVisibleLines) return 0
    const half = Math.floor(maxVisibleLines / 2)
    let startLine = Math.max(0, line - half)
    const endLine = Math.min(allLines.length, startLine + maxVisibleLines)
    if (endLine - startLine < maxVisibleLines) startLine = Math.max(0, endLine - maxVisibleLines)
    return startLine
  }

  // FROM CC: getViewportCharOffset
  getViewportCharOffset(maxVisibleLines?: number): number {
    const startLine = this.getViewportStartLine(maxVisibleLines)
    if (startLine === 0) return 0
    const wrappedLines = this.measuredText.getWrappedLines()
    return wrappedLines[startLine]?.startOffset ?? 0
  }

  // FROM CC: getViewportCharEnd
  getViewportCharEnd(maxVisibleLines?: number): number {
    const startLine = this.getViewportStartLine(maxVisibleLines)
    const allLines = this.measuredText.getWrappedLines()
    if (maxVisibleLines === undefined || maxVisibleLines <= 0)
      return this.text.length
    const endLine = Math.min(allLines.length, startLine + maxVisibleLines)
    if (endLine >= allLines.length) return this.text.length
    return allLines[endLine]?.startOffset ?? this.text.length
  }

  // FROM CC: render — cursor char at the cursor offset, mask replacement,
  // invert styling, ghost text at end of input, viewport windowing.
  render(
    cursorChar: string,
    mask: string,
    invert: (text: string) => string,
    ghostText?: { text: string; dim: (text: string) => string },
    maxVisibleLines?: number,
  ): string {
    const { line, column } = this.getPosition()
    const allLines = this.measuredText.getWrappedText()

    const startLine = this.getViewportStartLine(maxVisibleLines)
    const endLine =
      maxVisibleLines !== undefined && maxVisibleLines > 0
        ? Math.min(allLines.length, startLine + maxVisibleLines)
        : allLines.length

    return allLines
      .slice(startLine, endLine)
      .map((text, i) => {
        const currentLine = i + startLine
        let displayText = text
        if (mask) {
          const graphemes = Array.from(getGraphemeSegmenter().segment(text))
          if (currentLine === allLines.length - 1) {
            // Last line: mask all but the trailing 6 chars so the user can
            // confirm they pasted the right thing without exposing the full token
            const visibleCount = Math.min(6, graphemes.length)
            const maskCount = graphemes.length - visibleCount
            const splitOffset =
              graphemes.length > visibleCount ? graphemes[maskCount]!.index : 0
            displayText = mask.repeat(maskCount) + text.slice(splitOffset)
          } else {
            // Earlier wrapped lines: fully mask. Previously only the last line
            // was masked, leaking the start of the token on narrow terminals
            // where the pasted OAuth code wraps across multiple lines.
            displayText = mask.repeat(graphemes.length)
          }
        }
        // looking for the line with the cursor
        if (line !== currentLine) return displayText.trimEnd()

        // Split the line into before/at/after cursor in a single pass over the
        // graphemes, accumulating display width until we reach the cursor column.
        // This replaces a two-pass approach (displayWidthToStringIndex + a second
        // segmenter pass) — the intermediate stringIndex from that approach is
        // always a grapheme boundary, so the "cursor in the middle of a
        // multi-codepoint character" branch was unreachable.
        let beforeCursor = ''
        let atCursor = cursorChar
        let afterCursor = ''
        let currentWidth = 0
        let cursorFound = false

        for (const { segment } of getGraphemeSegmenter().segment(displayText)) {
          if (cursorFound) {
            afterCursor += segment
            continue
          }
          const nextWidth = currentWidth + stringWidth(segment)
          if (nextWidth > column) {
            atCursor = segment
            cursorFound = true
          } else {
            currentWidth = nextWidth
            beforeCursor += segment
          }
        }

        // Only invert the cursor if we have a cursor character to show
        // When ghost text is present and cursor is at end, show first ghost char in cursor
        let renderedCursor: string
        let ghostSuffix = ''
        if (
          ghostText &&
          currentLine === allLines.length - 1 &&
          this.isAtEnd() &&
          ghostText.text.length > 0
        ) {
          // First ghost character goes in the inverted cursor (grapheme-safe)
          const firstGhostChar =
            firstGrapheme(ghostText.text) || ghostText.text[0]!
          renderedCursor = cursorChar ? invert(firstGhostChar) : firstGhostChar
          // Rest of ghost text is dimmed after cursor
          const ghostRest = ghostText.text.slice(firstGhostChar.length)
          if (ghostRest.length > 0) {
            ghostSuffix = ghostText.dim(ghostRest)
          }
        } else {
          renderedCursor = cursorChar ? invert(atCursor) : atCursor
        }

        return (
          beforeCursor + renderedCursor + ghostSuffix + afterCursor.trimEnd()
        )
      })
      .join('\n')
  }
}

// ─── MeasuredText ─────────────────────────────────────────────────────────────

class WrappedLine {
  constructor(
    public readonly text: string,
    public readonly startOffset: number,
    public readonly isPrecededByNewline: boolean,
    public readonly endsWithNewline = false,
  ) {}
  get length(): number { return this.text.length + (this.endsWithNewline ? 1 : 0) }
}

export class MeasuredText {
  private _wrappedLines?: WrappedLine[]
  public readonly text: string
  private navigationCache = new Map<string, number>()
  private graphemeBoundaries?: number[]

  constructor(text: string, readonly columns: number) {
    this.text = text.normalize('NFC')
  }

  private get wrappedLines(): WrappedLine[] {
    if (!this._wrappedLines) this._wrappedLines = this.measureWrappedText()
    return this._wrappedLines
  }

  private getGraphemeBoundaries(): number[] {
    if (!this.graphemeBoundaries) {
      this.graphemeBoundaries = []
      for (const { index } of getGraphemeSegmenter().segment(this.text)) {
        this.graphemeBoundaries.push(index)
      }
      this.graphemeBoundaries.push(this.text.length)
    }
    return this.graphemeBoundaries
  }

  nextOffset(offset: number): number {
    return this.withCache(`next:${offset}`, () => {
      const b = this.getGraphemeBoundaries()
      return this.binarySearch(b, offset, true)
    })
  }
  prevOffset(offset: number): number {
    if (offset <= 0) return 0
    return this.withCache(`prev:${offset}`, () => {
      const b = this.getGraphemeBoundaries()
      return this.binarySearch(b, offset, false)
    })
  }
  snapToGraphemeBoundary(offset: number): number {
    if (offset <= 0) return 0
    if (offset >= this.text.length) return this.text.length
    const b = this.getGraphemeBoundaries()
    let lo = 0, hi = b.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (b[mid]! <= offset) lo = mid; else hi = mid - 1
    }
    return b[lo]!
  }

  private binarySearch(boundaries: number[], target: number, findNext: boolean): number {
    let lo = 0, hi = boundaries.length - 1
    let result = findNext ? this.text.length : 0
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2)
      const b = boundaries[mid]
      if (b === undefined) break
      if (findNext) {
        if (b > target) { result = b; hi = mid - 1 } else lo = mid + 1
      } else {
        if (b < target) { result = b; lo = mid + 1 } else hi = mid - 1
      }
    }
    return result
  }

  public getWordBoundaries(): Array<{ start: number; end: number; isWordLike: boolean }> {
    const result: Array<{ start: number; end: number; isWordLike: boolean }> = []
    for (const segment of getWordSegmenter().segment(this.text)) {
      result.push({ start: segment.index, end: segment.index + segment.segment.length, isWordLike: segment.isWordLike ?? false })
    }
    return result
  }

  public stringIndexToDisplayWidth(text: string, index: number): number {
    if (index <= 0) return 0
    if (index >= text.length) return stringWidth(text)
    return stringWidth(text.substring(0, index))
  }

  public displayWidthToStringIndex(text: string, targetWidth: number): number {
    if (targetWidth <= 0 || !text) return 0
    let currentWidth = 0, currentOffset = 0
    for (const { segment, index } of getGraphemeSegmenter().segment(text)) {
      const w = stringWidth(segment)
      if (currentWidth + w > targetWidth) break
      currentWidth += w
      currentOffset = index + segment.length
    }
    return currentOffset
  }

  public get lineCount(): number { return this.wrappedLines.length }
  public getWrappedText(): WrappedText { return this.wrappedLines.map(l => l.isPrecededByNewline ? l.text : l.text.trimStart()) }
  public getWrappedLines(): WrappedLine[] { return this.wrappedLines }
  public getLineLength(line: number): number { return stringWidth(this.wrappedLines[Math.max(0, Math.min(line, this.wrappedLines.length - 1))]!.text) }

  public getOffsetFromPosition(position: Position): number {
    const lines = this.wrappedLines
    const wl = lines[Math.max(0, Math.min(position.line, lines.length - 1))]!
    if (wl.text.length === 0 && wl.endsWithNewline) return wl.startOffset
    const leading = wl.isPrecededByNewline ? 0 : wl.text.length - wl.text.trimStart().length
    const idx = this.displayWidthToStringIndex(wl.text, position.column + leading)
    return Math.min(wl.startOffset + idx, wl.startOffset + wl.text.length)
  }

  public getPositionFromOffset(offset: number): Position {
    const lines = this.wrappedLines
    for (let i = 0; i < lines.length; i++) {
      const cur = lines[i]!
      const next = lines[i + 1]
      if (offset >= cur.startOffset && (!next || offset < next.startOffset)) {
        const posInLine = offset - cur.startOffset
        let col: number
        if (cur.isPrecededByNewline) {
          col = this.stringIndexToDisplayWidth(cur.text, posInLine)
        } else {
          const leading = cur.text.length - cur.text.trimStart().length
          if (posInLine < leading) col = 0
          else col = this.stringIndexToDisplayWidth(cur.text.trimStart(), posInLine - leading)
        }
        return { line: i, column: Math.max(0, col) }
      }
    }
    const last = lines[lines.length - 1]!
    return { line: lines.length - 1, column: stringWidth(last.text) }
  }

  private measureWrappedText(): WrappedLine[] {
    const wrappedText = wrapAnsi(this.text, this.columns, { hard: true, trim: false })
    const result: WrappedLine[] = []
    let searchOffset = 0, lastNl = -1

    for (let i = 0, lines = wrappedText.split('\n'); i < lines.length; i++) {
      const text = lines[i]!
      const isPrecededByNewline = (start: number) => i === 0 || (start > 0 && this.text[start - 1] === '\n')

      if (text.length === 0) {
        lastNl = this.text.indexOf('\n', lastNl + 1)
        const startOffset = lastNl !== -1 ? lastNl : this.text.length
        result.push(new WrappedLine(text, startOffset, isPrecededByNewline(startOffset), lastNl !== -1))
      } else {
        const startOffset = this.text.indexOf(text, searchOffset)
        if (startOffset === -1) throw new Error('Cursor: failed to find wrapped line in text')
        searchOffset = startOffset + text.length
        const hasNl = searchOffset < this.text.length && this.text[searchOffset] === '\n'
        if (hasNl) lastNl = searchOffset
        result.push(new WrappedLine(text, startOffset, isPrecededByNewline(startOffset), hasNl))
      }
    }
    return result
  }

  private withCache<T>(key: string, compute: () => T): T {
    const cached = this.navigationCache.get(key)
    if (cached !== undefined) return cached as T
    const result = compute()
    this.navigationCache.set(key, result as number)
    return result
  }
}
