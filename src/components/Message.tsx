import React from 'react'
import { Box, Text } from 'ink'
import type { Message as MessageType, ContentBlock } from '../types/message'
import { markdownToText } from '../utils/renderMarkdown'

interface Props {
  message: MessageType
}

function renderContentBlock(block: ContentBlock, key: number): React.ReactNode {
  switch (block.type) {
    case 'text': {
      const rendered = markdownToText(block.text)
      // Split on newlines and render each line
      const lines = rendered.split('\n')
      return (
        <Box key={key} flexDirection="column">
          {lines.map((line, i) => (
            <Text key={i}>{line}</Text>
          ))}
        </Box>
      )
    }
    case 'tool_use':
      return (
        <Box key={key} flexDirection="row" marginTop={0}>
          <Text color="yellow">  ⟳ {block.name}  </Text>
          <Text color="gray" dimColor>
            {JSON.stringify(block.input).slice(0, 80)}
            {JSON.stringify(block.input).length > 80 ? '...' : ''}
          </Text>
        </Box>
      )
    case 'tool_result':
      return null
    case 'image':
      return <Text key={key} color="gray">[Image]</Text>
    default:
      return null
  }
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'

  // CC's isMeta: true — recovery, budget nudge, tool summary injections are hidden from display
  if (message.isMeta) return null

  // Don't render pure tool-result messages
  if (!isUser && Array.isArray(message.content)) {
    const visible = message.content.filter(b => b.type !== 'tool_result')
    if (visible.length === 0) return null
  }

  // Skip system-internal user messages (tool results)
  if (isUser && Array.isArray(message.content)) {
    const allToolResults = message.content.every(b => b.type === 'tool_result')
    if (allToolResults) return null
  }

  const borderColor = isUser ? 'blue' : 'green'
  const label = isUser ? 'user' : 'assistant'

  const contentNode = typeof message.content === 'string'
    ? (
      <Box flexDirection="column">
        {markdownToText(message.content).split('\n').map((line: string, i: number) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>
    )
    : Array.isArray(message.content)
      ? <>{message.content.map((block, i) => renderContentBlock(block, i))}</>
      : null

  if (!contentNode) return null

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      marginBottom={1}
      paddingX={1}
    >
      <Text color={borderColor} bold>─ {label} </Text>
      {contentNode}
    </Box>
  )
}
