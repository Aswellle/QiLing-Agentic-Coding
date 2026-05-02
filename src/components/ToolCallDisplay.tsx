import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
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
  /** When true, the result is collapsed to COLLAPSE_THRESHOLD lines */
  defaultCollapsed?: boolean
}

const COLLAPSE_THRESHOLD = 8   // auto-collapse results longer than this
const PREVIEW_LINES = 4        // lines shown in collapsed mode

function formatInput(name: string, input: Record<string, unknown>): string {
  if (name === 'Bash' || name === 'PowerShell') return String(input.command ?? '').slice(0, 60)
  if (name === 'FileRead' || name === 'FileEdit' || name === 'FileWrite') {
    return String(input.file_path ?? input.path ?? '')
  }
  if (name === 'Glob') return String(input.pattern ?? '')
  if (name === 'Grep') return String(input.pattern ?? '')
  if (name === 'WebFetch' || name === 'WebSearch') return String(input.url ?? input.query ?? '')
  const keys = Object.keys(input)
  if (keys.length === 0) return ''
  return `${keys[0]}=${String(input[keys[0]]).slice(0, 40)}`
}

function formatDuration(start: number, end?: number): string {
  const ms = (end ?? Date.now()) - start
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// Tools whose output is never useful to show inline (already reflected in file or used by AI)
const SILENT_RESULT_TOOLS = new Set(['FileWrite', 'FileEdit', 'TodoWrite', 'Brief'])

export function ToolCallDisplay({ toolCall, defaultCollapsed }: Props) {
  const inputSummary = formatInput(toolCall.name, toolCall.input)
  const duration = toolCall.endTime ? formatDuration(toolCall.startTime, toolCall.endTime) : null
  const diff = toolCall.status === 'done' && toolCall.result
    ? parseDiffMeta(toolCall.result)
    : null

  const cleanResult = toolCall.result?.replace(/<!--DIFF:.+?-->/s, '').trim() ?? ''
  const resultLines = cleanResult.split('\n')
  const isLong = resultLines.length > COLLAPSE_THRESHOLD
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? isLong)

  // Allow Enter to toggle collapse on focused tool (simplified — no focus tracking)
  useInput((_input, key) => {
    if (key.return && toolCall.status === 'done' && isLong) {
      setCollapsed(c => !c)
    }
  })

  const showResult = toolCall.status === 'done'
    && cleanResult
    && !diff
    && !SILENT_RESULT_TOOLS.has(toolCall.name)

  const displayedLines = collapsed ? resultLines.slice(0, PREVIEW_LINES) : resultLines
  const hiddenCount = resultLines.length - PREVIEW_LINES

  const statusColor = toolCall.status === 'error' ? 'red'
    : toolCall.status === 'done' ? 'green' : 'yellow'

  return (
    <Box flexDirection="column" marginLeft={2} marginBottom={0}>
      {/* Header row */}
      <Box flexDirection="row">
        {toolCall.status === 'running' && <Text color="yellow"><Spinner type="dots" /></Text>}
        {toolCall.status === 'done' && <Text color="green">✓</Text>}
        {toolCall.status === 'error' && <Text color="red">✗</Text>}
        <Text color={statusColor}>{' '}{toolCall.name}</Text>
        {inputSummary && <Text color="gray">  {inputSummary}</Text>}
        {duration && <Text color="gray">  [{duration}]</Text>}
        {showResult && isLong && (
          <Text color="gray" dimColor>  {collapsed ? '▶ 折叠' : '▼ 展开'}</Text>
        )}
      </Box>

      {/* Diff view for FileEdit */}
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

      {/* Tool result with auto-collapse */}
      {showResult && (
        <Box flexDirection="column" marginLeft={3}>
          {displayedLines.map((line, i) => (
            <Text key={i} color={toolCall.status === 'error' ? 'red' : 'gray'} dimColor>
              {line}
            </Text>
          ))}
          {collapsed && hiddenCount > 0 && (
            <Text color="gray" dimColor>
              … {hiddenCount} 行已折叠 (按 Enter 展开)
            </Text>
          )}
        </Box>
      )}

      {/* Error output (always shown in full for errors) */}
      {toolCall.status === 'error' && cleanResult && (
        <Box marginLeft={3}>
          <Text color="red" dimColor>{cleanResult.slice(0, 300)}{cleanResult.length > 300 ? '…' : ''}</Text>
        </Box>
      )}
    </Box>
  )
}
