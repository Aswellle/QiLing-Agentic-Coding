/**
 * Agent task completion notification — adapted from CC's components/messages/UserAgentNotificationMessage.tsx
 *
 * Renders task completion/failure notifications for background agent tasks.
 */

import React from 'react'
import { Box, Text } from 'ink'
import { BLACK_CIRCLE } from '../../constants/figures.js'
import { extractTag } from '../../utils/messages.js'

type Props = {
  addMargin: boolean
  text: string
}

function getStatusColor(status: string | null): string | undefined {
  switch (status) {
    case 'completed': return 'green'
    case 'failed':    return 'red'
    case 'killed':    return 'yellow'
    default:          return undefined
  }
}

export function UserAgentNotificationMessage({ addMargin, text }: Props): React.ReactNode {
  const summary = extractTag(text, 'summary')
  if (!summary) return null

  const status = extractTag(text, 'status')
  const color = getStatusColor(status)

  return (
    <Box marginTop={addMargin ? 1 : 0}>
      <Text>
        <Text color={color}>{BLACK_CIRCLE}</Text> {summary}
      </Text>
    </Box>
  )
}
