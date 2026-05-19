/**
 * Highlighted thinking text — adapted from CC's components/messages/HighlightedThinkingText.tsx
 *
 * Renders user prompt text with:
 * - Brief mode: "You" label + timestamp + plain text
 * - Normal mode: ❯ pointer + text (with rainbow coloring for ultrathink keywords)
 */

import figures from 'figures'
import React, { useContext } from 'react'
import { Box, Text } from 'ink'
import { useQueuedMessage } from '../../context/QueuedMessageContext.js'
import { formatBriefTimestamp } from '../../utils/formatBriefTimestamp.js'
import {
  findThinkingTriggerPositions,
  getRainbowColor,
} from '../../utils/thinking.js'

type Props = {
  text: string
  useBriefLayout?: boolean
  timestamp?: string
}

// Simple context for message selection state
const MessageActionsSelectedContext = React.createContext(false)

export { MessageActionsSelectedContext }

export function HighlightedThinkingText({ text, useBriefLayout, timestamp }: Props): React.ReactNode {
  const isQueued = useQueuedMessage()?.isQueued ?? false
  const isSelected = useContext(MessageActionsSelectedContext)
  const pointerColor = isSelected ? 'cyan' : undefined

  if (useBriefLayout) {
    const ts = timestamp ? formatBriefTimestamp(timestamp) : ''
    return (
      <Box flexDirection="column" paddingLeft={2}>
        <Box flexDirection="row">
          <Text color={isQueued ? undefined : 'green'} dimColor={isQueued}>你</Text>
          {ts ? <Text dimColor> {ts}</Text> : null}
        </Box>
        <Text dimColor={isQueued}>{text}</Text>
      </Box>
    )
  }

  // Check for ultrathink triggers (rainbow coloring)
  const triggers = findThinkingTriggerPositions(text)

  if (triggers.length === 0) {
    return (
      <Text>
        <Text color={pointerColor} dimColor={!isSelected}>{figures.pointer} </Text>
        <Text>{text}</Text>
      </Text>
    )
  }

  // Render with rainbow-colored trigger words
  const parts: React.ReactNode[] = []
  let cursor = 0
  for (const t of triggers) {
    if (t.start > cursor) {
      parts.push(<Text key={`plain-${cursor}`}>{text.slice(cursor, t.start)}</Text>)
    }
    for (let i = t.start; i < t.end; i++) {
      parts.push(
        <Text key={`rb-${i}`} color={getRainbowColor(i - t.start)}>{text[i]}</Text>,
      )
    }
    cursor = t.end
  }
  if (cursor < text.length) {
    parts.push(<Text key={`plain-${cursor}`}>{text.slice(cursor)}</Text>)
  }

  return (
    <Text>
      <Text color={pointerColor} dimColor={!isSelected}>{figures.pointer} </Text>
      {parts}
    </Text>
  )
}
