import React, { useState, useCallback, useRef } from 'react'
import { Box, Text, useInput } from 'ink'
import {
  createInitialVimState, createInitialPersistentState,
  transition, type VimState, type PersistentState, type VimEditContext,
} from '../vim/engine'

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
}

// Session-level input history
const inputHistory: string[] = []
let historyIndex = -1

export function PromptInput({ onSubmit, isDisabled, commands, placeholder, vimMode = false }: Props) {
  const [value, setValue] = useState('')
  const [showCommands, setShowCommands] = useState(false)
  const [commandFilter, setCommandFilter] = useState('')
  const [selectedCommand, setSelectedCommand] = useState(0)
  const [cursorPos, setCursorPos] = useState(0)

  // Vim state (only used when vimMode=true)
  const vimStateRef = useRef<VimState>(createInitialVimState())
  const persistentRef = useRef<PersistentState>(createInitialPersistentState())
  const [vimDisplayMode, setVimDisplayMode] = useState<'INSERT' | 'NORMAL'>('INSERT')

  const filteredCommands = commands.filter(cmd =>
    cmd.name.toLowerCase().startsWith(commandFilter.toLowerCase().slice(1))
  )

  const makeEditContext = useCallback((
    curVal: string,
    curPos: number,
    setVal: (v: string) => void,
    setPos: (p: number) => void,
    enterInsertFn: (pos: number) => void
  ): VimEditContext => ({
    text: curVal,
    cursor: curPos,
    setText: setVal,
    setCursor: setPos,
    enterInsert: enterInsertFn,
    getRegister: () => persistentRef.current.register,
    setRegister: (s) => { persistentRef.current.register = s },
  }), [])

  useInput(
    useCallback((input: string, key: {
      upArrow: boolean; downArrow: boolean; return: boolean;
      backspace: boolean; delete: boolean; tab: boolean; escape: boolean;
      ctrl: boolean; meta: boolean; shift: boolean;
      leftArrow: boolean; rightArrow: boolean;
    }) => {
      if (isDisabled) return

      // ── VIM MODE ─────────────────────────────────────────────────────────
      if (vimMode) {
        const vs = vimStateRef.current

        if (vs.mode === 'INSERT') {
          // Escape → Normal
          if (key.escape) {
            const newPos = Math.max(0, cursorPos - 1)
            // Save insert text to lastChange for dot-repeat
            if (vs.insertedText) {
              persistentRef.current.lastChange = { type: 'insert', text: vs.insertedText }
            }
            vimStateRef.current = { mode: 'NORMAL', command: { type: 'idle' }, insertedText: '' }
            setVimDisplayMode('NORMAL')
            setCursorPos(newPos)
            setShowCommands(false)
            return
          }
          // Track inserted text for dot-repeat
          if (!key.ctrl && !key.meta && input) {
            vimStateRef.current = { ...vs, insertedText: vs.insertedText + input }
          }
          // Fall through to normal insert handling below
        } else {
          // NORMAL mode — delegate to vim engine
          const result = transition(vs, persistentRef.current, input, key)

          if (result) {
            if (result.sideEffect) {
              let newValue = value
              let newCursor = cursorPos

              const ctx = makeEditContext(
                value, cursorPos,
                (v) => { newValue = v },
                (p) => { newCursor = p },
                (pos) => {
                  // enterInsert called inside sideEffect — schedule mode switch
                  const resolvedPos = pos === 9999 ? newValue.length :
                                      pos === -1 ? 0 :
                                      pos === 1 ? cursorPos + 1 :
                                      cursorPos
                  newCursor = Math.max(0, Math.min(resolvedPos, newValue.length))
                  vimStateRef.current = { mode: 'INSERT', command: { type: 'idle' }, insertedText: '' }
                  setVimDisplayMode('INSERT')
                }
              )
              result.sideEffect(ctx, persistentRef.current)
              setValue(newValue)
              setCursorPos(Math.max(0, Math.min(newCursor, Math.max(0, newValue.length - 1))))
            }

            if (result.enterInsert !== undefined && vimStateRef.current.mode !== 'INSERT') {
              const raw = result.enterInsert
              const pos = raw === true ? cursorPos :
                          raw === 9999 ? value.length :
                          raw === -1 ? 0 :
                          cursorPos + (raw as number)
              const clipped = Math.max(0, Math.min(pos, value.length))
              setCursorPos(clipped)
              vimStateRef.current = { mode: 'INSERT', command: { type: 'idle' }, insertedText: '' }
              setVimDisplayMode('INSERT')
            } else {
              vimStateRef.current = { ...vs, command: result.nextCommand }
            }
          }

          // In NORMAL mode, only Return submits; escape/arrow/motions handled above
          if (key.return) {
            const trimmed = value.trim()
            if (trimmed) {
              if (inputHistory[0] !== trimmed) {
                inputHistory.unshift(trimmed)
                if (inputHistory.length > 100) inputHistory.pop()
              }
              historyIndex = -1
              onSubmit(trimmed)
              setValue('')
              setCursorPos(0)
              setShowCommands(false)
              setCommandFilter('')
              vimStateRef.current = createInitialVimState()
              setVimDisplayMode('INSERT')
            }
          }
          return  // NORMAL mode handled fully above
        }
      }

      // ── NORMAL INSERT MODE (also INSERT branch of vim mode) ───────────────

      if (key.escape) {
        setShowCommands(false)
        setCommandFilter('')
        setSelectedCommand(0)
        return
      }

      if (showCommands) {
        if (key.upArrow) { setSelectedCommand(s => Math.max(0, s - 1)); return }
        if (key.downArrow) { setSelectedCommand(s => Math.min(filteredCommands.length - 1, s + 1)); return }
        if ((key.return || key.tab) && filteredCommands.length > 0) {
          const cmd = filteredCommands[selectedCommand]!
          setValue(cmd.name + ' ')
          setCursorPos(cmd.name.length + 1)
          setShowCommands(false); setCommandFilter(''); setSelectedCommand(0)
          return
        }
      }

      if (key.return) {
        const trimmed = value.trim()
        if (trimmed) {
          if (inputHistory[0] !== trimmed) {
            inputHistory.unshift(trimmed)
            if (inputHistory.length > 100) inputHistory.pop()
          }
          historyIndex = -1
          onSubmit(trimmed)
          setValue(''); setCursorPos(0); setShowCommands(false); setCommandFilter('')
        }
        return
      }

      if (!showCommands) {
        if (key.upArrow && inputHistory.length > 0) {
          const newIdx = Math.min(historyIndex + 1, inputHistory.length - 1)
          historyIndex = newIdx
          const hist = inputHistory[newIdx]!
          setValue(hist); setCursorPos(hist.length); return
        }
        if (key.downArrow) {
          if (historyIndex > 0) {
            const newIdx = historyIndex - 1; historyIndex = newIdx
            const hist = inputHistory[newIdx]!; setValue(hist); setCursorPos(hist.length)
          } else { historyIndex = -1; setValue(''); setCursorPos(0) }
          return
        }
        if (key.leftArrow) { setCursorPos(p => Math.max(0, p - 1)); return }
        if (key.rightArrow) { setCursorPos(p => Math.min(value.length, p + 1)); return }
      }

      if (key.backspace || key.delete) {
        if (cursorPos > 0) {
          const newVal = value.slice(0, cursorPos - 1) + value.slice(cursorPos)
          setValue(newVal); setCursorPos(p => p - 1)
          if (newVal.startsWith('/')) { setCommandFilter(newVal); setShowCommands(true) }
          else { setShowCommands(false); setCommandFilter('') }
        }
        return
      }

      if (!key.ctrl && !key.meta && input) {
        const newVal = value.slice(0, cursorPos) + input + value.slice(cursorPos)
        setValue(newVal); setCursorPos(p => p + input.length)
        if (newVal.startsWith('/')) { setCommandFilter(newVal); setShowCommands(true); setSelectedCommand(0) }
        else { setShowCommands(false); setCommandFilter('') }
      }
    }, [value, cursorPos, showCommands, filteredCommands, selectedCommand, isDisabled, onSubmit, vimMode, makeEditContext])
  )

  const isNormalMode = vimMode && vimStateRef.current.mode === 'NORMAL'
  const displayValue = value.slice(0, cursorPos) + (isNormalMode ? '▌' : '█') + value.slice(cursorPos)

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
