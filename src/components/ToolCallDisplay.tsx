import React from 'react'
import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'

export interface ToolCallRecord {
  id: string
  name: string
  input: Record<string, unknown>
  status: 'running' | 'done' | 'error'
  result?: string
  startTime: number
  endTime?: number
}

interface Props {
  toolCall: ToolCallRecord
}

function formatInput(name: string, input: Record<string, unknown>): string {
  // Show the most relevant field based on tool type
  if (name === 'Bash' || name === 'PowerShell') {
    return String(input.command ?? '').slice(0, 60)
  }
  if (name === 'FileRead' || name === 'FileEdit' || name === 'FileWrite') {
    return String(input.file_path ?? input.path ?? '')
  }
  if (name === 'Glob') return String(input.pattern ?? '')
  if (name === 'Grep') return String(input.pattern ?? '')
  if (name === 'WebFetch') return String(input.url ?? '')
  const keys = Object.keys(input)
  if (keys.length === 0) return ''
  return `${keys[0]}=${String(input[keys[0]]).slice(0, 40)}`
}

function formatDuration(start: number, end?: number): string {
  const ms = (end ?? Date.now()) - start
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function ToolCallDisplay({ toolCall }: Props) {
  const inputSummary = formatInput(toolCall.name, toolCall.input)
  const duration = toolCall.endTime ? formatDuration(toolCall.startTime, toolCall.endTime) : null

  return (
    <Box flexDirection="column" marginLeft={2} marginBottom={0}>
      <Box flexDirection="row">
        {toolCall.status === 'running' && (
          <Text color="yellow"><Spinner type="dots" /></Text>
        )}
        {toolCall.status === 'done' && (
          <Text color="green">✓</Text>
        )}
        {toolCall.status === 'error' && (
          <Text color="red">✗</Text>
        )}
        <Text color={toolCall.status === 'error' ? 'red' : toolCall.status === 'done' ? 'green' : 'yellow'}>
          {' '}{toolCall.name}
        </Text>
        {inputSummary && (
          <Text color="gray">  {inputSummary}</Text>
        )}
        {duration && (
          <Text color="gray">  [{duration}]</Text>
        )}
      </Box>

      {/* Show truncated result on error */}
      {toolCall.status === 'error' && toolCall.result && (
        <Box marginLeft={3}>
          <Text color="red" dimColor>
            {toolCall.result.slice(0, 100)}
            {toolCall.result.length > 100 ? '...' : ''}
          </Text>
        </Box>
      )}
    </Box>
  )
}
