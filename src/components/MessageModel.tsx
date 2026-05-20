/**
 * MessageModel — adapted from CC's components/MessageModel.tsx
 *
 * Displays the model name for assistant messages in transcript mode.
 * Only rendered when isTranscriptMode=true and message has text content.
 */

import React from 'react'
import { Box, Text } from 'ink'
import { stringWidth } from '../ink/stringWidth.js'
import type { Message } from '../types/message.js'

type Props = {
  message: Message
  isTranscriptMode: boolean
}

export function MessageModel({ message, isTranscriptMode }: Props): React.ReactNode {
  const model = message.role === 'assistant' ? (message as { model?: string }).model : undefined
  const content = Array.isArray(message.content) ? message.content : []
  const hasText = content.some((c: { type: string }) => c.type === 'text')

  if (!isTranscriptMode || !model || !hasText) return null

  return (
    <Box minWidth={stringWidth(model) + 8}>
      <Text dimColor>{model}</Text>
    </Box>
  )
}
