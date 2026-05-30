import figures from 'figures'
import * as React from 'react'
import { ProgressBar } from '../../components/design-system/ProgressBar.js'
import { MessageResponse } from '../../components/MessageResponse.js'
import { OutputLine } from '../../components/shell/OutputLine.js'
import { Ansi } from '../../ink/Ansi.js'
import { Box, Text } from 'ink'
import type { ToolProgressData } from '../../types/tool.js'
import type { ProgressMessage } from '../../types/message.js'
import { formatNumber } from '../../utils/format.js'
import { createHyperlink } from '../../utils/hyperlink.js'
import { getContentSizeEstimate, type MCPToolResult } from '../../utils/mcpValidation.js'
import { jsonParse, jsonStringify } from '../../utils/slowOperations.js'

// FROM CC: bun-bundle feature flags — always false (QiLing uses standard rendering)
const feature = (_flag: string) => false

// Threshold for displaying warning about large MCP responses
const MCP_OUTPUT_WARNING_THRESHOLD_TOKENS = 10_000
const MAX_INPUT_VALUE_CHARS = 80
const MAX_FLAT_JSON_KEYS = 12
const MAX_FLAT_JSON_CHARS = 5_000
const MAX_JSON_PARSE_CHARS = 200_000
const UNWRAP_MIN_STRING_LEN = 200

type MCPProgress = {
  type: string
  progress?: number
  total?: number
  progressMessage?: string
}

type Input = Record<string, unknown>

export function renderToolUseMessage(
  input: Input,
  { verbose }: { verbose: boolean },
): React.ReactNode {
  if (Object.keys(input).length === 0) {
    return ''
  }
  return Object.entries(input)
    .map(([key, value]) => {
      let rendered = jsonStringify(value)
      if (!verbose && rendered.length > MAX_INPUT_VALUE_CHARS) {
        rendered = rendered.slice(0, MAX_INPUT_VALUE_CHARS).trimEnd() + '…'
      }
      return `${key}: ${rendered}`
    })
    .join(', ')
}

export function renderToolUseProgressMessage(
  progressMessagesForMessage: ProgressMessage<MCPProgress>[],
): React.ReactNode {
  const lastProgress = progressMessagesForMessage.at(-1)
  if (!lastProgress?.data) {
    return (
      <MessageResponse height={1}>
        <Text dimColor>Running…</Text>
      </MessageResponse>
    )
  }
  const { progress, total, progressMessage } = lastProgress.data
  if (progress === undefined) {
    return (
      <MessageResponse height={1}>
        <Text dimColor>Running…</Text>
      </MessageResponse>
    )
  }
  if (total !== undefined && total > 0) {
    const ratio = Math.min(1, Math.max(0, progress / total))
    const percentage = Math.round(ratio * 100)
    return (
      <MessageResponse>
        <Box flexDirection="column">
          {progressMessage && <Text dimColor>{progressMessage}</Text>}
          <Box flexDirection="row" gap={1}>
            <ProgressBar ratio={ratio} width={20} />
            <Text dimColor>{percentage}%</Text>
          </Box>
        </Box>
      </MessageResponse>
    )
  }
  return (
    <MessageResponse height={1}>
      <Text dimColor>{progressMessage ?? `Processing… ${progress}`}</Text>
    </MessageResponse>
  )
}

// FROM CC: trySlackSendCompact - Slack-specific compact rendering stub
const trySlackSendCompact = (
  _output: MCPToolResult,
  _input?: unknown,
): { url: string; channel: string } | null => null

export function renderToolResultMessage(
  output: string | MCPToolResult,
  _progressMessagesForMessage: ProgressMessage<ToolProgressData>[],
  { verbose, input }: { verbose: boolean; input?: unknown },
): React.ReactNode {
  const mcpOutput = output as MCPToolResult

  if (!verbose) {
    const slackSend = trySlackSendCompact(mcpOutput, input)
    if (slackSend !== null) {
      return (
        <MessageResponse height={1}>
          <Text>
            Sent a message to{' '}
            <Ansi>{createHyperlink(slackSend.url, slackSend.channel)}</Ansi>
          </Text>
        </MessageResponse>
      )
    }
  }

  const estimatedTokens = getContentSizeEstimate(mcpOutput)
  const showWarning = estimatedTokens > MCP_OUTPUT_WARNING_THRESHOLD_TOKENS
  const warningMessage = showWarning
    ? `${figures.warning} Large MCP response (~${formatNumber(estimatedTokens)} tokens), this can fill up context quickly`
    : null

  let contentElement: React.ReactNode

  if (Array.isArray(mcpOutput)) {
    const contentBlocks = mcpOutput.map((item, i) => {
      if (item.type === 'image') {
        return (
          <Box key={i} justifyContent="space-between" overflowX="hidden" width="100%">
            <MessageResponse height={1}>
              <Text>[Image]</Text>
            </MessageResponse>
          </Box>
        )
      }
      const textContent =
        item.type === 'text' && 'text' in item && item.text != null
          ? String(item.text)
          : ''
      return <OutputLine key={i} content={textContent} verbose={verbose} />
    })

    contentElement = (
      <Box flexDirection="column" width="100%">
        {contentBlocks}
      </Box>
    )
  } else if (!mcpOutput) {
    contentElement = (
      <Box justifyContent="space-between" overflowX="hidden" width="100%">
        <MessageResponse height={1}>
          <Text dimColor>(No content)</Text>
        </MessageResponse>
      </Box>
    )
  } else {
    contentElement = <OutputLine content={mcpOutput} verbose={verbose} />
  }

  return (
    <Box flexDirection="column" width="100%">
      {warningMessage && (
        <MessageResponse>
          <Text color="warning">{warningMessage}</Text>
        </MessageResponse>
      )}
      {contentElement}
    </Box>
  )
}
