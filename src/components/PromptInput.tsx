import React, { useState, useCallback } from 'react'
import { Box, Text, useInput } from 'ink'

export interface SlashCommand {
  name: string
  description: string
}

interface Props {
  onSubmit: (text: string) => void
  isDisabled?: boolean
  commands: SlashCommand[]
  placeholder?: string
}

export function PromptInput({ onSubmit, isDisabled, commands, placeholder }: Props) {
  const [value, setValue] = useState('')
  const [showCommands, setShowCommands] = useState(false)
  const [commandFilter, setCommandFilter] = useState('')
  const [selectedCommand, setSelectedCommand] = useState(0)
  const [cursorPos, setCursorPos] = useState(0)

  const filteredCommands = commands.filter(cmd =>
    cmd.name.toLowerCase().startsWith(commandFilter.toLowerCase().slice(1))
  )

  useInput(
    useCallback((input: string, key: {
      upArrow: boolean; downArrow: boolean; return: boolean;
      backspace: boolean; delete: boolean; tab: boolean; escape: boolean;
      ctrl: boolean; meta: boolean; shift: boolean;
    }) => {
      if (isDisabled) return

      if (key.escape) {
        setShowCommands(false)
        setCommandFilter('')
        setSelectedCommand(0)
        return
      }

      if (showCommands) {
        if (key.upArrow) {
          setSelectedCommand(s => Math.max(0, s - 1))
          return
        }
        if (key.downArrow) {
          setSelectedCommand(s => Math.min(filteredCommands.length - 1, s + 1))
          return
        }
        if (key.return && filteredCommands.length > 0) {
          const cmd = filteredCommands[selectedCommand]
          setValue(cmd.name + ' ')
          setCursorPos(cmd.name.length + 1)
          setShowCommands(false)
          setCommandFilter('')
          setSelectedCommand(0)
          return
        }
        if (key.tab && filteredCommands.length > 0) {
          const cmd = filteredCommands[selectedCommand]
          setValue(cmd.name + ' ')
          setCursorPos(cmd.name.length + 1)
          setShowCommands(false)
          setCommandFilter('')
          return
        }
      }

      if (key.return) {
        const trimmed = value.trim()
        if (trimmed) {
          onSubmit(trimmed)
          setValue('')
          setCursorPos(0)
          setShowCommands(false)
          setCommandFilter('')
        }
        return
      }

      if (key.backspace || key.delete) {
        if (cursorPos > 0) {
          const newVal = value.slice(0, cursorPos - 1) + value.slice(cursorPos)
          setValue(newVal)
          setCursorPos(p => p - 1)

          if (newVal.startsWith('/')) {
            setCommandFilter(newVal)
            setShowCommands(true)
          } else {
            setShowCommands(false)
            setCommandFilter('')
          }
        }
        return
      }

      if (!key.ctrl && !key.meta && input) {
        const newVal = value.slice(0, cursorPos) + input + value.slice(cursorPos)
        setValue(newVal)
        setCursorPos(p => p + input.length)

        if (newVal.startsWith('/')) {
          setCommandFilter(newVal)
          setShowCommands(true)
          setSelectedCommand(0)
        } else {
          setShowCommands(false)
          setCommandFilter('')
        }
      }
    }, [value, cursorPos, showCommands, filteredCommands, selectedCommand, isDisabled, onSubmit])
  )

  const displayValue = value.slice(0, cursorPos) + '█' + value.slice(cursorPos)

  return (
    <Box flexDirection="column">
      {/* Command menu */}
      {showCommands && filteredCommands.length > 0 && (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="gray"
          paddingLeft={1}
          paddingRight={1}
          marginBottom={0}
        >
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

      {/* Input row */}
      <Box flexDirection="row">
        <Text color={isDisabled ? 'gray' : 'cyan'}>
          {isDisabled ? '⟳ ' : '> '}
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
