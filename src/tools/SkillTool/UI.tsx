import type { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import * as React from 'react'
import { SubAgentProvider } from '../../components/CtrlOToExpand.js'
import { FallbackToolUseErrorMessage } from '../../components/FallbackToolUseErrorMessage.js'
import { FallbackToolUseRejectedMessage } from '../../components/FallbackToolUseRejectedMessage.js'
import { Byline } from '../../components/design-system/Byline.js'
import { MessageResponse } from '../../components/MessageResponse.js'
import { Box, Text } from 'ink'
import type { ProgressMessage } from '../../types/message.js'
import { plural } from '../../utils/stringUtils.js'

type Command = { name: string; loadedFrom?: string }
type Input = { skill?: string }
type Output = {
  status?: string
  allowedTools?: string[]
  model?: string
}
// FROM CC: Progress includes sub-agent message data
type Progress = { type: string; [key: string]: unknown }

const MAX_PROGRESS_MESSAGES_TO_SHOW = 3
const INITIALIZING_TEXT = 'Initializing…'

export function renderToolResultMessage(output: Output): React.ReactNode {
  // Handle forked skill result
  if ('status' in output && output.status === 'forked') {
    return (
      <MessageResponse height={1}>
        <Text>
          <Byline>{['Done']}</Byline>
        </Text>
      </MessageResponse>
    )
  }

  const parts: string[] = ['Successfully loaded skill']

  if (
    'allowedTools' in output &&
    output.allowedTools &&
    output.allowedTools.length > 0
  ) {
    const count = output.allowedTools.length
    parts.push(`${count} ${plural(count, 'tool')} allowed`)
  }

  if ('model' in output && output.model) {
    parts.push(output.model)
  }

  return (
    <MessageResponse height={1}>
      <Text>
        <Byline>{parts}</Byline>
      </Text>
    </MessageResponse>
  )
}

export function renderToolUseMessage(
  { skill }: Partial<Input>,
  { commands }: { commands?: Command[] },
): React.ReactNode {
  if (!skill) {
    return null
  }
  const command = commands?.find(c => c.name === skill)
  const displayName =
    command?.loadedFrom === 'commands_DEPRECATED' ? `/${skill}` : skill
  return displayName
}

export function renderToolUseProgressMessage(
  progressMessages: ProgressMessage<Progress>[],
  {
    tools,
    verbose,
  }: {
    tools: unknown
    verbose: boolean
  },
): React.ReactNode {
  if (!progressMessages.length) {
    return (
      <MessageResponse height={1}>
        <Text dimColor>{INITIALIZING_TEXT}</Text>
      </MessageResponse>
    )
  }

  const displayedMessages = verbose
    ? progressMessages
    : progressMessages.slice(-MAX_PROGRESS_MESSAGES_TO_SHOW)

  const hiddenCount = progressMessages.length - displayedMessages.length
  // FROM CC: MessageComponent used here for sub-agent inline rendering; simplified to text
  return (
    <MessageResponse>
      <Box flexDirection="column">
        <SubAgentProvider>
          {displayedMessages.map(progressMessage => (
            <Box key={progressMessage.uuid} height={1} overflow="hidden">
              <Text dimColor>{String((progressMessage.data as Record<string, unknown>).type ?? '')}</Text>
            </Box>
          ))}
        </SubAgentProvider>
        {hiddenCount > 0 && (
          <Text dimColor>
            +{hiddenCount} more tool {plural(hiddenCount, 'use')}
          </Text>
        )}
      </Box>
    </MessageResponse>
  )
}

export function renderToolUseRejectedMessage(
  _input: Input,
  {
    progressMessagesForMessage,
    tools,
    verbose,
  }: {
    progressMessagesForMessage: ProgressMessage<Progress>[]
    tools: unknown
    verbose: boolean
  },
): React.ReactNode {
  return (
    <>
      {renderToolUseProgressMessage(progressMessagesForMessage, {
        tools,
        verbose,
      })}
      <FallbackToolUseRejectedMessage />
    </>
  )
}

export function renderToolUseErrorMessage(
  result: ToolResultBlockParam['content'],
  {
    progressMessagesForMessage,
    tools,
    verbose,
  }: {
    progressMessagesForMessage: ProgressMessage<Progress>[]
    tools: unknown
    verbose: boolean
  },
): React.ReactNode {
  return (
    <>
      {renderToolUseProgressMessage(progressMessagesForMessage, {
        tools,
        verbose,
      })}
      <FallbackToolUseErrorMessage result={result} verbose={verbose} />
    </>
  )
}
