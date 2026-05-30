import * as React from 'react'
import { MessageResponse } from '../../components/MessageResponse.js'
// FROM CC: OutputLine component not yet ported — waiting for components/shell/OutputLine
// import { OutputLine } from '../../components/shell/OutputLine.js'
import { Text } from 'ink'
import type { ToolProgressData } from '../../types/tool.js'
import type { ProgressMessage } from '../../types/message.js'
import { jsonStringify } from '../../utils/slowOperations.js'

type Output = unknown[]

export function renderToolUseMessage(
  input: Partial<{ server?: string }>,
): React.ReactNode {
  return input.server
    ? `List MCP resources from server "${input.server}"`
    : `List all MCP resources`
}

export function renderToolResultMessage(
  output: Output,
  _progressMessagesForMessage: ProgressMessage<ToolProgressData>[],
  { verbose: _verbose }: { verbose: boolean },
): React.ReactNode {
  if (!output || output.length === 0) {
    return (
      <MessageResponse height={1}>
        <Text dimColor>(No resources found)</Text>
      </MessageResponse>
    )
  }

  const formattedOutput = jsonStringify(output, null, 2)
  // FROM CC: OutputLine not yet ported; fallback to plain text
  return (
    <MessageResponse>
      <Text dimColor>{formattedOutput}</Text>
    </MessageResponse>
  )
}
