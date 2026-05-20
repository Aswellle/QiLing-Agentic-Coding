/**
 * ShellProgressMessage — adapted from CC's components/shell/ShellProgressMessage.tsx
 *
 * Displays live shell command output with elapsed time and line/byte counts.
 * Wrapped in OffscreenFreeze to prevent full terminal resets when scrolled out.
 */

import React from 'react'
import { Box, Text } from 'ink'
import { formatFileSize } from '../../utils/format.js'
import { MessageResponse } from '../MessageResponse.js'
import { OffscreenFreeze } from '../OffscreenFreeze.js'
import { ShellTimeDisplay } from './ShellTimeDisplay.js'

function stripAnsiSimple(s: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional
  return s.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
}

type Props = {
  output: string
  fullOutput: string
  elapsedTimeSeconds?: number
  totalLines?: number
  totalBytes?: number
  timeoutMs?: number
  taskId?: string
  verbose: boolean
}

export function ShellProgressMessage({
  output,
  fullOutput,
  elapsedTimeSeconds,
  totalLines,
  totalBytes,
  timeoutMs,
  verbose,
}: Props): React.ReactNode {
  const strippedFullOutput = stripAnsiSimple(fullOutput.trim())
  const strippedOutput = stripAnsiSimple(output.trim())
  const lines = strippedOutput.split('\n').filter(line => line)
  const displayLines = verbose ? strippedFullOutput : lines.slice(-5).join('\n')

  if (!lines.length) {
    return (
      <MessageResponse>
        <OffscreenFreeze>
          <Text dimColor>Running… </Text>
          <ShellTimeDisplay elapsedTimeSeconds={elapsedTimeSeconds} timeoutMs={timeoutMs} />
        </OffscreenFreeze>
      </MessageResponse>
    )
  }

  const extraLines = totalLines ? Math.max(0, totalLines - 5) : 0
  let lineStatus = ''
  if (!verbose && totalBytes && totalLines) {
    lineStatus = `~${totalLines} lines`
  } else if (!verbose && extraLines > 0) {
    lineStatus = `+${extraLines} lines`
  }

  return (
    <MessageResponse>
      <OffscreenFreeze>
        <Box flexDirection="column">
          <Box height={verbose ? undefined : Math.min(5, lines.length)} flexDirection="column" overflow="hidden">
            <Text dimColor>{displayLines}</Text>
          </Box>
          <Box flexDirection="row" gap={1}>
            {lineStatus ? <Text dimColor>{lineStatus}</Text> : null}
            <ShellTimeDisplay elapsedTimeSeconds={elapsedTimeSeconds} timeoutMs={timeoutMs} />
            {totalBytes ? <Text dimColor>{formatFileSize(totalBytes)}</Text> : null}
          </Box>
        </Box>
      </OffscreenFreeze>
    </MessageResponse>
  )
}
