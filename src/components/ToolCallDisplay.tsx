import React from 'react'
import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import { DiffView } from './DiffView'

interface DiffMeta {
  __diff: true
  file_path: string
  old_string: string
  new_string: string
}

function parseDiffMeta(result: string): DiffMeta | null {
  const m = result.match(/<!--DIFF:(.+?)-->/)
  if (!m) return null
  try {
    return JSON.parse(m[1]) as DiffMeta
  } catch {
    return null
  }
}

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
  const diff = toolCall.status === 'done' && toolCall.result
    ? parseDiffMeta(toolCall.result)
    : null

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

      {/* Diff view for FileEdit completions */}
      {diff && (
        <Box marginLeft={2}>
          <DiffView
            filePath={diff.file_path}
            oldString={diff.old_string}
            newString={diff.new_string}
            contextLines={3}
          />
        </Box>
      )}

      {/* Error output */}
      {toolCall.status === 'error' && toolCall.result && (
        <Box marginLeft={3}>
          <Text color="red" dimColor>
            {toolCall.result.replace(/<!--DIFF:.+?-->/s, '').slice(0, 120)}
            {toolCall.result.length > 120 ? '...' : ''}
          </Text>
        </Box>
      )}
    </Box>
  )
}
