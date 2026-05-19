/**
 * Bash input display message — adapted from CC's components/messages/UserBashInputMessage.tsx
 *
 * Renders a ! shell command in the conversation with a distinct visual style.
 */

import React from 'react'
import { Box, Text } from 'ink'
import { extractTag } from '../../utils/messages.js'

type Props = {
  addMargin: boolean
  text: string
}

export function UserBashInputMessage({ text, addMargin }: Props): React.ReactNode {
  const input = extractTag(text, 'bash-input')
  if (!input) return null

  return (
    <Box
      flexDirection="row"
      marginTop={addMargin ? 1 : 0}
      paddingRight={1}
    >
      <Text color="cyan" bold>! </Text>
      <Text>{input}</Text>
    </Box>
  )
}
