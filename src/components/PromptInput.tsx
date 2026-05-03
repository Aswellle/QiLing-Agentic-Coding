import React, { useState, useCallback, useRef } from 'react'
import { Box, Text, useInput } from 'ink'
import { Cursor } from '../utils/Cursor'
import { lastGrapheme } from '../utils/intl'
import {
  executeIndent, executeJoin, executeOpenLine,
  executeOperatorFind, executeOperatorMotion, executeOperatorTextObj,
  executeReplace, executeToggleCase, executeX,
  type OperatorContext,
} from '../vim/operators'
import { transition, type TransitionContext } from '../vim/transitions'
import {
  createInitialVimState, createInitialPersistentState,
  type VimState, type PersistentState, type RecordedChange, type VimMode,
} from '../vim/types'

export interface SlashCommand {
  name: string
  description: string
}

interface Props {
  onSubmit: (text: string) => void
  isDisabled?: boolean
  commands: SlashCommand[]
  placeholder?: string
  vimMode?: boolean
  onVimModeChange?: (mode: VimMode, pendingOp?: string) => void
}

// Session-level input history
const inputHistory: string[] = []
let historyIndex = -1

// Terminal width for Cursor line wrapping
const COLUMNS = process.stdout.columns ?? 120

export function PromptInput({ onSubmit, isDisabled, commands, placeholder, vimMode = false, onVimModeChange }: Props) {
  const [value, setValue] = useState('')
  const [showCommands, setShowCommands] = useState(false)
  const [commandFilter, setCommandFilter] = useState('')
  const [selectedCommand, setSelectedCommand] = useState(0)
  const [cursorOffset, setCursorOffset] = useState(0)

  // Vim state
  const vimStateRef = useRef<VimState>(createInitialVimState())
  const persistentRef = useRef<PersistentState>(createInitialPersistentState())
  const [vimDisplayMode, setVimDisplayMode] = useState<VimMode>('INSERT')

  const filteredCommands = commands.filter(cmd =>
    cmd.name.toLowerCase().startsWith(commandFilter.toLowerCase().slice(1))
  )

  // ── Vim helpers ─────────────────────────────────────────────────────────────

  function makeCursor(text: string, offset: number): Cursor {
    return Cursor.fromText(text, COLUMNS, offset)
  }

  function switchToInsert(offset?: number): void {
    if (offset !== undefined) setCursorOffset(offset)
    vimStateRef.current = { mode: 'INSERT', insertedText: '' }
    setVimDisplayMode('INSERT')
    onVimModeChange?.('INSERT')
  }

  function switchToNormal(): void {
    const vs = vimStateRef.current
    if (vs.mode === 'INSERT' && vs.insertedText) {
      persistentRef.current.lastChange = { type: 'insert', text: vs.insertedText }
    }
    setCursorOffset(prev => Math.max(0, prev - (prev > 0 ? 1 : 0)))
    vimStateRef.current = { mode: 'NORMAL', command: { type: 'idle' } }
    setVimDisplayMode('NORMAL')
    onVimModeChange?.('NORMAL')
  }

  function replayLastChange(curValue: string, curOffset: number, onUpdate: (v: string, o: number) => void): void {
    const change = persistentRef.current.lastChange
    if (!change) return
    const cursor = makeCursor(curValue, curOffset)
    let newValue = curValue, newOffset = curOffset
    const ctx = makeCtx(cursor, curValue, (v) => { newValue = v }, (o) => { newOffset = o }, () => {})
    const replayCtx = { ...ctx, recordChange: () => {} }

    switch (change.type) {
      case 'insert': {
        const nc = cursor.insert(change.text)
        newValue = nc.text; newOffset = nc.offset; break
      }
      case 'x': executeX(change.count, replayCtx); break
      case 'replace': executeReplace(change.char, change.count, replayCtx); break
      case 'toggleCase': executeToggleCase(change.count, replayCtx); break
      case 'indent': executeIndent(change.dir, change.count, replayCtx); break
      case 'join': executeJoin(change.count, replayCtx); break
      case 'openLine': executeOpenLine(change.direction, replayCtx); break
      case 'operator': executeOperatorMotion(change.op, change.motion, change.count, replayCtx); break
      case 'operatorFind': executeOperatorFind(change.op, change.find, change.char, change.count, replayCtx); break
      case 'operatorTextObj': executeOperatorTextObj(change.op, change.scope, change.objType, change.count, replayCtx); break
    }
    onUpdate(newValue, newOffset)
  }

  function makeCtx(
    cursor: Cursor, curValue: string,
    onSetText: (v: string) => void, onSetOffset: (o: number) => void,
    onEnterInsert: (o: number) => void,
  ): OperatorContext {
    return {
      cursor,
      text: curValue,
      setText: onSetText,
      setOffset: onSetOffset,
      enterInsert: onEnterInsert,
      getRegister: () => persistentRef.current.register,
      setRegister: (content, linewise) => {
        persistentRef.current.register = content
        persistentRef.current.registerIsLinewise = linewise
      },
      getLastFind: () => persistentRef.current.lastFind,
      setLastFind: (type, char) => { persistentRef.current.lastFind = { type, char } },
      recordChange: (change: RecordedChange) => { persistentRef.current.lastChange = change },
    }
  }

  // ── Main input handler ───────────────────────────────────────────────────────

  useInput(
    useCallback((input: string, key: {
      upArrow: boolean; downArrow: boolean; return: boolean;
      backspace: boolean; delete: boolean; tab: boolean; escape: boolean;
      ctrl: boolean; meta: boolean; shift: boolean;
      leftArrow: boolean; rightArrow: boolean;
    }) => {
      if (isDisabled) return

      // ── VIM MODE ───────────────────────────────────────────────────────────
      if (vimMode) {
        const vs = vimStateRef.current

        if (vs.mode === 'INSERT') {
          if (key.escape) {
            switchToNormal()
            setShowCommands(false)
            return
          }
          // Track inserted text for dot-repeat
          if (key.backspace || key.delete) {
            if (vs.insertedText.length > 0) {
              const lg = lastGrapheme(vs.insertedText)
              vimStateRef.current = { mode: 'INSERT', insertedText: vs.insertedText.slice(0, -(lg.length || 1)) }
            }
          } else if (!key.ctrl && !key.meta && input) {
            vimStateRef.current = { mode: 'INSERT', insertedText: vs.insertedText + input }
          }
          // Fall through to normal insert handling below
        } else {
          // NORMAL mode
          if (key.escape) {
            vimStateRef.current = { mode: 'NORMAL', command: { type: 'idle' } }
            return
          }
          if (key.return) {
            const trimmed = value.trim()
            if (trimmed) {
              if (inputHistory[0] !== trimmed) { inputHistory.unshift(trimmed); if (inputHistory.length > 100) inputHistory.pop() }
              historyIndex = -1
              onSubmit(trimmed); setValue(''); setCursorOffset(0); setShowCommands(false); setCommandFilter('')
              vimStateRef.current = createInitialVimState(); setVimDisplayMode('INSERT')
            }
            return
          }

          // Arrow keys in idle state → history navigation / cursor
          if (vs.command.type === 'idle' && (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow)) {
            if (key.leftArrow) setCursorOffset(p => Math.max(0, p - 1))
            else if (key.rightArrow) setCursorOffset(p => Math.min(value.length, p + 1))
            // up/down in NORMAL: history navigation
            else if (key.upArrow && inputHistory.length > 0) {
              const newIdx = Math.min(historyIndex + 1, inputHistory.length - 1); historyIndex = newIdx
              const h = inputHistory[newIdx]!; setValue(h); setCursorOffset(h.length)
            } else if (key.downArrow) {
              if (historyIndex > 0) { const newIdx = historyIndex - 1; historyIndex = newIdx; const h = inputHistory[newIdx]!; setValue(h); setCursorOffset(h.length) }
              else { historyIndex = -1; setValue(''); setCursorOffset(0) }
            }
            return
          }

          // Map arrow keys to vim motions
          let vimInput = input
          if (key.leftArrow) vimInput = 'h'
          else if (key.rightArrow) vimInput = 'l'
          else if (key.upArrow) vimInput = 'k'
          else if (key.downArrow) vimInput = 'j'

          const expectsMotion = vs.command.type === 'idle' || vs.command.type === 'count' || vs.command.type === 'operator' || vs.command.type === 'operatorCount'
          if (expectsMotion && key.backspace) vimInput = 'h'
          else if (expectsMotion && vs.command.type !== 'count' && key.delete) vimInput = 'x'

          let newValue = value
          let newOffset = cursorOffset

          const cursor = makeCursor(value, cursorOffset)
          const ctx: TransitionContext = {
            ...makeCtx(
              cursor, value,
              (v) => { newValue = v },
              (o) => { newOffset = o },
              (o) => { newOffset = o; vimStateRef.current = { mode: 'INSERT', insertedText: '' }; setVimDisplayMode('INSERT') },
            ),
            onUndo: undefined,
            onDotRepeat: () => replayLastChange(newValue, newOffset, (v, o) => { newValue = v; newOffset = o }),
          }

          const result = transition(vs.command, vimInput, ctx)

          if (result.execute) result.execute()

          setValue(newValue)
          // Clamp to normal-mode limit (can't be past last char)
          const maxNormal = Math.max(0, newValue.length - 1)
          if (vimStateRef.current.mode === 'NORMAL') {
            setCursorOffset(Math.min(newOffset, newValue.length === 0 ? 0 : maxNormal))
            if (result.next) {
              vimStateRef.current = { mode: 'NORMAL', command: result.next }
              // Notify StatusBar of pending operator (shows [N:d], [N:c] etc.)
              const pendingOp = result.next.type === 'operator' ? result.next.op[0] : undefined
              onVimModeChange?.('NORMAL', pendingOp)
            } else if (result.execute) {
              vimStateRef.current = { mode: 'NORMAL', command: { type: 'idle' } }
              onVimModeChange?.('NORMAL')
            }
          } else {
            // Entered insert mode
            setCursorOffset(Math.min(newOffset, newValue.length))
          }
          return
        }
      }

      // ── NORMAL INSERT (or INSERT branch of vim) ────────────────────────────

      if (key.escape) { setShowCommands(false); setCommandFilter(''); setSelectedCommand(0); return }

      if (showCommands) {
        if (key.upArrow) { setSelectedCommand(s => Math.max(0, s - 1)); return }
        if (key.downArrow) { setSelectedCommand(s => Math.min(filteredCommands.length - 1, s + 1)); return }
        if ((key.return || key.tab) && filteredCommands.length > 0) {
          const cmd = filteredCommands[selectedCommand]!
          setValue(cmd.name + ' '); setCursorOffset(cmd.name.length + 1)
          setShowCommands(false); setCommandFilter(''); setSelectedCommand(0); return
        }
      }

      if (key.return) {
        const trimmed = value.trim()
        if (trimmed) {
          if (inputHistory[0] !== trimmed) { inputHistory.unshift(trimmed); if (inputHistory.length > 100) inputHistory.pop() }
          historyIndex = -1
          onSubmit(trimmed); setValue(''); setCursorOffset(0); setShowCommands(false); setCommandFilter('')
        }
        return
      }

      if (!showCommands) {
        if (key.upArrow && inputHistory.length > 0) {
          const newIdx = Math.min(historyIndex + 1, inputHistory.length - 1); historyIndex = newIdx
          const h = inputHistory[newIdx]!; setValue(h); setCursorOffset(h.length); return
        }
        if (key.downArrow) {
          if (historyIndex > 0) { const newIdx = historyIndex - 1; historyIndex = newIdx; const h = inputHistory[newIdx]!; setValue(h); setCursorOffset(h.length) }
          else { historyIndex = -1; setValue(''); setCursorOffset(0) }
          return
        }
        if (key.leftArrow) { setCursorOffset(p => Math.max(0, p - 1)); return }
        if (key.rightArrow) { setCursorOffset(p => Math.min(value.length, p + 1)); return }
      }

      if (key.backspace || key.delete) {
        if (cursorOffset > 0) {
          const cursor = makeCursor(value, cursorOffset)
          const newCursor = cursor.backspace()
          setValue(newCursor.text); setCursorOffset(newCursor.offset)
          if (newCursor.text.startsWith('/')) { setCommandFilter(newCursor.text); setShowCommands(true) }
          else { setShowCommands(false); setCommandFilter('') }
        }
        return
      }

      if (!key.ctrl && !key.meta && input) {
        const cursor = makeCursor(value, cursorOffset)
        const newCursor = cursor.insert(input)
        setValue(newCursor.text); setCursorOffset(newCursor.offset)
        if (newCursor.text.startsWith('/')) { setCommandFilter(newCursor.text); setShowCommands(true); setSelectedCommand(0) }
        else { setShowCommands(false); setCommandFilter('') }
      }
    }, [value, cursorOffset, showCommands, filteredCommands, selectedCommand, isDisabled, onSubmit, vimMode])
  )

  const isNormalMode = vimMode && vimStateRef.current.mode === 'NORMAL'
  const displayValue = value.slice(0, cursorOffset) + (isNormalMode ? '▌' : '█') + value.slice(cursorOffset)

  return (
    <Box flexDirection="column">
      {showCommands && filteredCommands.length > 0 && (
        <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingLeft={1} paddingRight={1} marginBottom={0}>
          <Text color="gray">─ 命令 ─────────────────────────────</Text>
          {filteredCommands.slice(0, 8).map((cmd, i) => (
            <Box key={cmd.name} flexDirection="row">
              <Text color={i === selectedCommand ? 'cyan' : 'white'} bold={i === selectedCommand}>
                {cmd.name.padEnd(12)}
              </Text>
              <Text color="gray">  {cmd.description}</Text>
            </Box>
          ))}
        </Box>
      )}

      <Box flexDirection="row">
        {vimMode && (
          <Text color={vimDisplayMode === 'NORMAL' ? 'yellow' : 'cyan'} bold>
            {vimDisplayMode === 'NORMAL' ? '[N] ' : '[I] '}
          </Text>
        )}
        <Text color={isDisabled ? 'gray' : 'cyan'}>
          {isDisabled ? '⟳ ' : (vimMode ? '' : '> ')}
        </Text>
        {value || !isDisabled ? (
          <Text color={isDisabled ? 'gray' : 'white'}>
            {isDisabled ? '' : displayValue}
          </Text>
        ) : (
          <Text color="gray">{placeholder ?? '输入消息，/ 查看命令...'}</Text>
        )}
      </Box>
    </Box>
  )
}
