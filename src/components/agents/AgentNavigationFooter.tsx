/**
 * Agent navigation footer — adapted from CC's components/agents/AgentNavigationFooter.tsx
 *
 * Displays keyboard navigation hints in agent selection dialogs.
 * Shows "press again to exit" when Ctrl+C/D is pending.
 */

import React from 'react'
import { Box, Text } from 'ink'

type Props = {
  instructions?: string
}

export function AgentNavigationFooter({
  instructions = '↑↓ 导航 · Enter 选择 · Esc 返回',
}: Props): React.ReactNode {
  return (
    <Box marginLeft={2}>
      <Text dimColor>{instructions}</Text>
    </Box>
  )
}
