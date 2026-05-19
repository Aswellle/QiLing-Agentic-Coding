/**
 * Memory input message display — adapted from CC's components/messages/UserMemoryInputMessage.tsx
 *
 * Renders a # memory save message in the conversation with a distinctive
 * highlighted style and a friendly confirmation ("Got it.", "Noted.", etc.)
 */

import React, { useMemo } from 'react'
import { Box, Text } from 'ink'
import { extractTag } from '../../utils/messages.js'

const SAVING_MESSAGES = ['知道了。', '好的。', '已记录。', 'Got it.', 'Noted.', 'Good to know.']

function getSavingMessage(): string {
  return SAVING_MESSAGES[Math.floor(Math.random() * SAVING_MESSAGES.length)]!
}

type Props = {
  addMargin: boolean
  text: string
}

export function UserMemoryInputMessage({ text, addMargin }: Props): React.ReactNode {
  const input = extractTag(text, 'user-memory-input')
  const savingText = useMemo(() => getSavingMessage(), [])

  if (!input) return null

  return (
    <Box flexDirection="column" marginTop={addMargin ? 1 : 0} width="100%">
      <Box>
        <Text color="cyan" bold>#</Text>
        <Text color="cyan"> {input}</Text>
      </Box>
      <Box marginLeft={2}>
        <Text dimColor>{savingText}</Text>
      </Box>
    </Box>
  )
}
