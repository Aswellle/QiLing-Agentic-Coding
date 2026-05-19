/**
 * Channel message display — adapted from CC's components/messages/UserChannelMessage.tsx
 *
 * Renders messages received via MCP channel integrations (Discord, Slack, SMS, etc.)
 * Format: <channel source="slack" user="alice">Hello!</channel>
 */

import React from 'react'
import { Box, Text } from 'ink'
import { CHANNEL_ARROW } from '../../constants/figures.js'
import { CHANNEL_TAG } from '../../constants/xml.js'

type Props = {
  addMargin: boolean
  text: string
}

const CHANNEL_RE = new RegExp(
  `<${CHANNEL_TAG}\\s+source="([^"]+)"([^>]*)>\\n?([\\s\\S]*?)\\n?<\\/${CHANNEL_TAG}>`,
)
const USER_ATTR_RE = /\buser="([^"]+)"/

function displayServerName(name: string): string {
  const i = name.lastIndexOf(':')
  return i === -1 ? name : name.slice(i + 1)
}

const TRUNCATE_AT = 80

export function UserChannelMessage({ addMargin, text }: Props): React.ReactNode {
  const m = CHANNEL_RE.exec(text)
  if (!m) return null

  const [, source, attrs, content] = m
  const userMatch = USER_ATTR_RE.exec(attrs ?? '')
  const user = userMatch?.[1]
  const displaySource = displayServerName(source ?? '')
  const truncatedContent = (content ?? '').slice(0, TRUNCATE_AT)
  const isTruncated = (content ?? '').length > TRUNCATE_AT

  return (
    <Box marginTop={addMargin ? 1 : 0} flexDirection="row" gap={1}>
      <Text color="cyan">{CHANNEL_ARROW}</Text>
      <Text dimColor>{displaySource}</Text>
      {user && <Text dimColor>@{user}</Text>}
      <Text dimColor>:</Text>
      <Text>{truncatedContent}{isTruncated ? '…' : ''}</Text>
    </Box>
  )
}
