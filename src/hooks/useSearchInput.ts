/**
 * Search input hook — adapted from CC's hooks/useSearchInput.ts
 *
 * Full-featured text input for search boxes: cursor movement, word jump,
 * kill ring (ctrl+k/u/w/y), emacs bindings (ctrl+a/e/b/f/d/h), and yank-pop.
 * Handles Esc (clear → exit), backspace-past-empty, and passthrough ctrl keys.
 */

import { useCallback, useState } from 'react'
import { useInput } from 'ink'
import type { Key } from 'ink'
import {
  Cursor,
  getLastKill,
  pushToKillRing,
  recordYank,
  resetKillAccumulation,
  resetYankState,
  updateYankLength,
  yankPop,
} from '../utils/Cursor.js'
import { useTerminalSize } from './useTerminalSize.js'

type Options = {
  isActive: boolean
  onExit: () => void
  onCancel?: () => void
  onExitUp?: () => void
  columns?: number
  passthroughCtrlKeys?: string[]
  initialQuery?: string
  backspaceExitsOnEmpty?: boolean
}

type Return = {
  query: string
  setQuery: (q: string) => void
  cursorOffset: number
}

const UNHANDLED_SPECIAL_KEYS = new Set([
  'pageup', 'pagedown', 'insert', 'wheelUp', 'wheelDown',
  'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12',
])

export function useSearchInput({
  isActive,
  onExit,
  onCancel,
  onExitUp,
  columns,
  passthroughCtrlKeys = [],
  initialQuery = '',
  backspaceExitsOnEmpty = true,
}: Options): Return {
  const { columns: terminalColumns } = useTerminalSize()
  const effectiveColumns = columns ?? terminalColumns
  const [query, setQueryState] = useState(initialQuery)
  const [cursorOffset, setCursorOffset] = useState(initialQuery.length)

  const setQuery = useCallback((q: string) => {
    setQueryState(q)
    setCursorOffset(q.length)
  }, [])

  useInput(
    (input: string, key: Key) => {
      if (!isActive) return

      const cursor = Cursor.fromText(query, effectiveColumns, cursorOffset)

      const isKill = key.ctrl && (input === 'k' || input === 'u' || input === 'w')
      const isYank = key.ctrl && input === 'y'

      if (!isKill) resetKillAccumulation()
      if (!isYank) resetYankState()

      // Passthrough ctrl keys
      if (key.ctrl && passthroughCtrlKeys.includes(input.toLowerCase())) return

      // Enter / Down = commit
      if (key.return || key.downArrow) { onExit(); return }

      // Up = exit up
      if (key.upArrow) { if (onExitUp) onExitUp(); return }

      // Escape = cancel or clear
      if (key.escape) {
        if (onCancel) { onCancel(); return }
        if (query.length > 0) { setQueryState(''); setCursorOffset(0) }
        else onExit()
        return
      }

      // Backspace
      if (key.backspace) {
        if (key.meta) {
          const { cursor: nc, killed } = cursor.deleteWordBefore()
          pushToKillRing(killed, 'prepend')
          setQueryState(nc.text); setCursorOffset(nc.offset)
          return
        }
        if (query.length === 0) {
          if (backspaceExitsOnEmpty) (onCancel ?? onExit)()
          return
        }
        const nc = cursor.backspace()
        setQueryState(nc.text); setCursorOffset(nc.offset)
        return
      }

      // Delete
      if (key.delete) {
        const nc = cursor.del()
        setQueryState(nc.text); setCursorOffset(nc.offset)
        return
      }

      // Arrows with modifiers = word jump
      if (key.leftArrow && (key.ctrl || key.meta)) { setCursorOffset(cursor.prevWORD().offset); return }
      if (key.rightArrow && (key.ctrl || key.meta)) { setCursorOffset(cursor.nextWORD().offset); return }
      if (key.leftArrow) { setCursorOffset(cursor.left().offset); return }
      if (key.rightArrow) { setCursorOffset(cursor.right().offset); return }
      // home/end keys (key.home/key.end not in Ink's Key type, fall back to ctrl+a/e)
      if ((key as Record<string, unknown>).home) { setCursorOffset(0); return }
      if ((key as Record<string, unknown>).end) { setCursorOffset(query.length); return }
      if (key.tab) return

      // Ctrl bindings
      if (key.ctrl) {
        switch (input.toLowerCase()) {
          case 'a': setCursorOffset(0); return
          case 'e': setCursorOffset(query.length); return
          case 'b': setCursorOffset(cursor.left().offset); return
          case 'f': setCursorOffset(cursor.right().offset); return
          case 'd': {
            if (query.length === 0) { (onCancel ?? onExit)(); return }
            const nc = cursor.del(); setQueryState(nc.text); setCursorOffset(nc.offset); return
          }
          case 'h': {
            if (query.length === 0) { if (backspaceExitsOnEmpty) (onCancel ?? onExit)(); return }
            const nc = cursor.backspace(); setQueryState(nc.text); setCursorOffset(nc.offset); return
          }
          case 'k': {
            const { cursor: nc, killed } = cursor.deleteToLineEnd()
            pushToKillRing(killed, 'append'); setQueryState(nc.text); setCursorOffset(nc.offset); return
          }
          case 'u': {
            const { cursor: nc, killed } = cursor.deleteToLineStart()
            pushToKillRing(killed, 'prepend'); setQueryState(nc.text); setCursorOffset(nc.offset); return
          }
          case 'w': {
            const { cursor: nc, killed } = cursor.deleteWordBefore()
            pushToKillRing(killed, 'prepend'); setQueryState(nc.text); setCursorOffset(nc.offset); return
          }
          case 'y': {
            const text = getLastKill()
            if (text.length > 0) {
              const startOffset = cursor.offset
              const nc = cursor.insert(text)
              recordYank(startOffset, text.length)
              setQueryState(nc.text); setCursorOffset(nc.offset)
            }
            return
          }
          case 'g':
          case 'c':
            if (onCancel) { onCancel(); return }
            return
        }
        return
      }

      // Meta bindings
      if (key.meta) {
        switch (input.toLowerCase()) {
          case 'b': setCursorOffset(cursor.prevWORD().offset); return
          case 'f': setCursorOffset(cursor.nextWORD().offset); return
          case 'd': { const nc = cursor.deleteWordAfter(); setQueryState(nc.text); setCursorOffset(nc.offset); return }
          case 'y': {
            const pop = yankPop()
            if (pop) {
              const { text, start, length } = pop
              const newText = query.slice(0, start) + text + query.slice(start + length)
              updateYankLength(text.length)
              setQueryState(newText); setCursorOffset(start + text.length)
            }
            return
          }
        }
        return
      }

      // Regular text input
      if (input.length >= 1 && !UNHANDLED_SPECIAL_KEYS.has(input)) {
        const nc = cursor.insert(input)
        setQueryState(nc.text); setCursorOffset(nc.offset)
      }
    },
    { isActive },
  )

  return { query, setQuery, cursorOffset }
}
