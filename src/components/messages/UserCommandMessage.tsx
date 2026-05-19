/**
 * Slash command message display — adapted from CC's components/messages/UserCommandMessage.tsx
 *
 * Renders slash commands like /commit, /review in the conversation.
 * Skills use "Skill(name)" format; other commands use "❯ /command args" format.
 */

import figures from 'figures'
import React from 'react'
import { Box, Text } from 'ink'
import { COMMAND_MESSAGE_TAG } from '../../constants/xml.js'
import { extractTag } from '../../utils/messages.js'

type Props = {
  addMargin: boolean
  text: string
}

export function UserCommandMessage({ addMargin, text }: Props): React.ReactNode {
  const commandMessage = extractTag(text, COMMAND_MESSAGE_TAG)
  const args = extractTag(text, 'command-args')
  const isSkillFormat = extractTag(text, 'skill-format') === 'true'

  if (!commandMessage) return null

  if (isSkillFormat) {
    return (
      <Box flexDirection="column" marginTop={addMargin ? 1 : 0} paddingRight={1}>
        <Text>
          <Text dimColor>{figures.pointer} </Text>
          <Text>Skill({commandMessage})</Text>
        </Text>
      </Box>
    )
  }

  const content = `/${[commandMessage, args].filter(Boolean).join(' ')}`
  return (
    <Box flexDirection="column" marginTop={addMargin ? 1 : 0} paddingRight={1}>
      <Text>
        <Text dimColor>{figures.pointer} </Text>
        <Text>{content}</Text>
      </Text>
    </Box>
  )
}
