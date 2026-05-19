/**
 * User-canceled tool call message — adapted from CC's components/messages/UserToolResultMessage/UserToolCanceledMessage.tsx
 */

import React from 'react'
import { Box } from 'ink'
import { InterruptedByUser } from '../../InterruptedByUser.js'

export function UserToolCanceledMessage(): React.ReactNode {
  return (
    <Box>
      <InterruptedByUser />
    </Box>
  )
}
