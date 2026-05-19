/**
 * Bash tool output display — adapted from CC's components/messages/UserBashOutputMessage.tsx
 *
 * Renders bash tool output from a user message content block.
 * Handles both direct bash-stdout and persisted-output wrapping.
 */

import React from 'react'
import { Box, Text } from 'ink'
import { extractTag } from '../../utils/messages.js'

type Props = {
  content: string
  verbose?: boolean
}

export function UserBashOutputMessage({ content, verbose }: Props): React.ReactNode {
  const rawStdout = extractTag(content, 'bash-stdout') ?? ''
  // Unwrap <persisted-output> — keep inner content for display;
  // the wrapper tag is model-facing signaling only
  const stdout = extractTag(rawStdout, 'persisted-output') ?? rawStdout
  const stderr = extractTag(content, 'bash-stderr') ?? ''

  if (!stdout && !stderr) return null

  return (
    <Box flexDirection="column">
      {stdout && <Text>{stdout}</Text>}
      {stderr && <Text color="yellow" dimColor>[stderr] {stderr}</Text>}
    </Box>
  )
}
