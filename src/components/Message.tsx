import React from 'react'
import { Box, Text } from 'ink'
import type { Message as MessageType, ContentBlock } from '../types/message'

interface Props {
  message: MessageType
}

function renderContentBlock(block: ContentBlock, key: number): React.ReactNode {
  switch (block.type) {
    case 'text':
      return <Text key={key}>{block.text}</Text>
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
      return null // Tool results are shown by ToolCallDisplay
    case 'image':
      return <Text key={key} color="gray">[Image]</Text>
    default:
      return null
  }
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'
  const borderColor = isUser ? 'blue' : 'green'
  const labelColor = isUser ? 'blue' : 'green'
  const label = isUser ? 'user' : 'assistant'

  // Don't render pure tool-result messages (internal plumbing)
  if (!isUser && Array.isArray(message.content)) {
    const allToolResults = message.content.every(b => b.type === 'tool_result')
    if (allToolResults) return null
  }

  const contentNode = typeof message.content === 'string'
    ? <Text>{message.content}</Text>
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
      paddingLeft={1}
      paddingRight={1}
      paddingTop={0}
      paddingBottom={0}
    >
      <Text color={labelColor} bold>─ {label} </Text>
      {contentNode}
    </Box>
  )
}
