// Vim text objects — ported from CC's vim/textObjects.ts

import type { TextObjScope } from './types'

export interface TextObjectRange {
  start: number
  end: number  // exclusive
}

const PAIRS: Record<string, string> = {
  '(': ')', ')': '(',
  '[': ']', ']': '[',
  '{': '}', '}': '{',
  '<': '>', '>': '<',
}

const QUOTES = new Set(['"', "'", '`'])

export function findTextObject(
  type: string,
  scope: TextObjScope,
  text: string,
  pos: number
): TextObjectRange | null {
  if (type === 'w' || type === 'W') return findWordObject(type === 'W', scope, text, pos)
  if (QUOTES.has(type)) return findQuoteObject(type, scope, text, pos)
  if (PAIRS[type] !== undefined || type === 'B') return findBracketObject(type, scope, text, pos)
  return null
}

function findWordObject(WORD: boolean, scope: TextObjScope, text: string, pos: number): TextObjectRange | null {
  const isWord = WORD ? (c: string) => /\S/.test(c) : (c: string) => /[a-zA-Z0-9_]/.test(c)

  // Expand left
  let start = pos
  while (start > 0 && isWord(text[start - 1] ?? '')) start--

  // Expand right
  let end = pos
  while (end < text.length && isWord(text[end] ?? '')) end++

  if (start === end) return null  // Not on a word

  if (scope === 'around') {
    // Include trailing space
    while (end < text.length && text[end] === ' ') end++
    // If no trailing space, include leading space
    if (end === pos + 1) {
      while (start > 0 && text[start - 1] === ' ') start--
    }
  }

  return { start, end }
}

function findQuoteObject(quote: string, scope: TextObjScope, text: string, pos: number): TextObjectRange | null {
  // Find enclosing quotes on the same line
  let left = pos - 1
  while (left >= 0 && text[left] !== quote) left--
  let right = pos + 1 <= text.length ? pos : pos + 1
  while (right < text.length && text[right] !== quote) right++

  if (left < 0 || right >= text.length) return null

  if (scope === 'inner') return { start: left + 1, end: right }
  return { start: left, end: right + 1 }
}

function findBracketObject(type: string, scope: TextObjScope, text: string, pos: number): TextObjectRange | null {
  const open = type === 'B' ? '{' : (PAIRS[type] === '}' || type === '{' ? '{' : (PAIRS[type] !== undefined ? type : type))
  const close = type === 'B' ? '}' : (PAIRS[open] ?? open)
  const actualOpen = PAIRS[open] === open ? open : (Object.keys(PAIRS).find(k => PAIRS[k] === close && k !== close) ?? open)
  const actualClose = PAIRS[actualOpen] ?? close

  // Search backward for opening bracket
  let depth = 0
  let left = pos
  while (left >= 0) {
    if (text[left] === actualClose) depth++
    else if (text[left] === actualOpen) {
      if (depth === 0) break
      depth--
    }
    left--
  }
  if (left < 0) return null

  // Search forward for closing bracket
  depth = 0
  let right = pos
  while (right < text.length) {
    if (text[right] === actualOpen) depth++
    else if (text[right] === actualClose) {
      if (depth === 0) break
      depth--
    }
    right++
  }
  if (right >= text.length) return null

  if (scope === 'inner') return { start: left + 1, end: right }
  return { start: left, end: right + 1 }
}
