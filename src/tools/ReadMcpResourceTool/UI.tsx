import * as React from 'react'
import { MessageResponse } from '../../components/MessageResponse.js'
import { OutputLine } from '../../components/shell/OutputLine.js'
import { Box, Text } from 'ink'
import type { ToolProgressData } from '../../types/tool.js'
import type { ProgressMessage } from '../../types/message.js'
import { jsonStringify } from '../../utils/slowOperations.js'

type Input = { uri?: string; server?: string }
type Output = { contents?: unknown[] }

export function renderToolUseMessage(
  input: Partial<Input>,
): React.ReactNode {
  if (!input.uri || !input.server) {
    return null
  }
  return `Read resource "${input.uri}" from server "${input.server}"`
}

export function userFacingName(): string {
  return 'readMcpResource'
}

export function renderToolResultMessage(
  output: Output,
  _progressMessagesForMessage: ProgressMessage<ToolProgressData>[],
  { verbose: _verbose }: { verbose: boolean },
): React.ReactNode {
  if (!output || !output.contents || output.contents.length === 0) {
    return (
      <Box justifyContent="space-between" overflowX="hidden" width="100%">
        <MessageResponse height={1}>
          <Text dimColor>(No content)</Text>
        </MessageResponse>
      </Box>
    )
  }

  const formattedOutput = jsonStringify(output, null, 2)
  return <OutputLine content={formattedOutput} verbose={_verbose} />
}
