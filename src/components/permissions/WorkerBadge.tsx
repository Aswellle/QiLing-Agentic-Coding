/**
 * Worker badge — adapted from CC's components/permissions/WorkerBadge.tsx
 *
 * Renders a colored badge showing the swarm worker's name in permission prompts.
 * Used to indicate which worker agent is requesting permission.
 */

import React from 'react'
import { Box, Text } from 'ink'
import { BLACK_CIRCLE } from '../../constants/figures.js'
import { toInkColor } from '../../utils/ink.js'

export type WorkerBadgeProps = {
  name: string
  color: string
}

export function WorkerBadge({ name, color }: WorkerBadgeProps): React.ReactNode {
  const inkColor = toInkColor(color)
  return (
    <Box flexDirection="row" gap={1}>
      <Text color={inkColor}>
        {BLACK_CIRCLE} <Text bold>@{name}</Text>
      </Text>
    </Box>
  )
}
