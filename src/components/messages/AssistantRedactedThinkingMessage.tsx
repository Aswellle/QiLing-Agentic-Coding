/**
 * Redacted thinking indicator — adapted from CC's components/messages/AssistantRedactedThinkingMessage.tsx
 *
 * Shows when the model has extended thinking but the content is redacted.
 */

import React from 'react'
import { Box, Text } from 'ink'

type Props = {
  addMargin?: boolean
}

export function AssistantRedactedThinkingMessage({
  addMargin = false,
}: Props): React.ReactNode {
  return (
    <Box marginTop={addMargin ? 1 : 0}>
      <Text dimColor italic>
        ✻ 思考中…
      </Text>
    </Box>
  )
}
