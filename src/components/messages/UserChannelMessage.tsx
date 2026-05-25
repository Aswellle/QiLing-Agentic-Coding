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
import { truncateToWidth } from '../../utils/format.js'

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

// FROM CC: reduced from 80 to 60 to match CC's terminal width budget
const TRUNCATE_AT = 60

export function UserChannelMessage({ addMargin, text }: Props): React.ReactNode {
  const m = CHANNEL_RE.exec(text)
  if (!m) return null

  const [, source, attrs, content] = m
  const user = USER_ATTR_RE.exec(attrs ?? '')?.[1]
  const displaySource = displayServerName(source ?? '')
  // FROM CC: normalize whitespace before truncating
  const body = (content ?? '').trim().replace(/\s+/g, ' ')
  const truncated = truncateToWidth(body, TRUNCATE_AT)

  return (
    <Box marginTop={addMargin ? 1 : 0} flexDirection="row" gap={1}>
      <Text color="cyan">{CHANNEL_ARROW}</Text>{/* QILING-IDENTITY: theme key 'suggestion' → 'cyan' */}
      <Text dimColor>{displaySource}</Text>
      {user && <Text dimColor>@{user}</Text>}
      <Text dimColor>:</Text>
      <Text>{truncated}</Text>
    </Box>
  )
}
