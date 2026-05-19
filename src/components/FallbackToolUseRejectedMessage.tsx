/**
 * Fallback tool use rejected message — adapted from CC's components/FallbackToolUseRejectedMessage.tsx
 */

import React from 'react'
import { Box, Text } from 'ink'
import { InterruptedByUser } from './InterruptedByUser.js'

export function FallbackToolUseRejectedMessage(): React.ReactNode {
  return (
    <Box>
      <InterruptedByUser />
    </Box>
  )
}
