/**
 * Message timestamp display — adapted from CC's components/MessageTimestamp.tsx
 *
 * Shows timestamp for assistant messages in transcript/verbose mode.
 */

import React from 'react'
import { Box, Text } from 'ink'
import type { Message } from '../types/message.js'

type Props = {
  message: Message & { timestamp?: string; type?: string }
  isTranscriptMode: boolean
}

export function MessageTimestamp({ message, isTranscriptMode }: Props): React.ReactNode {
  const shouldShow =
    isTranscriptMode &&
    message.timestamp &&
    message.role === 'assistant'

  if (!shouldShow || !message.timestamp) return null

  const formattedTimestamp = new Date(message.timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return (
    <Box>
      <Text dimColor>{formattedTimestamp}</Text>
    </Box>
  )
}
