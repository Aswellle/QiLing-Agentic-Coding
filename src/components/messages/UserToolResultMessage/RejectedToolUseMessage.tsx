/**
 * Rejected tool use message — adapted from CC's components/messages/UserToolResultMessage/RejectedToolUseMessage.tsx
 */

import React from 'react'
import { Box, Text } from 'ink'

export function RejectedToolUseMessage(): React.ReactNode {
  return (
    <Box>
      <Text dimColor>工具调用被拒绝</Text>{/* LOC: rejected-tool-use-message.text = "Tool use rejected" */}
    </Box>
  )
}
