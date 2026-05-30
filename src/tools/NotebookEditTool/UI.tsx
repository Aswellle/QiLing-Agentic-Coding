import type { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import * as React from 'react'
import { FallbackToolUseErrorMessage } from '../../components/FallbackToolUseErrorMessage.js'
import { FilePathLink } from '../../components/FilePathLink.js'
import { MessageResponse } from '../../components/MessageResponse.js'
// FROM CC: HighlightedCode not yet ported
// FROM CC: NotebookEditToolUseRejectedMessage not yet ported
import { Box, Text } from 'ink'
import { extractTag } from '../../utils/messages.js'
import { getDisplayPath } from '../../utils/file.js'

type Input = {
  notebook_path?: string
  cell_id?: string
  new_source?: string
  cell_type?: string
  edit_mode?: string
}
type Output = { cell_id?: string; new_source?: string; error?: string }

export function getToolUseSummary(
  input: Partial<Input> | undefined,
): string | null {
  if (!input?.notebook_path) {
    return null
  }
  return getDisplayPath(input.notebook_path)
}

export function renderToolUseMessage(
  { notebook_path, cell_id, new_source, cell_type, edit_mode }: Partial<Input>,
  { verbose }: { verbose: boolean },
): React.ReactNode {
  if (!notebook_path || !new_source || !cell_type) {
    return null
  }
  const displayPath = verbose ? notebook_path : getDisplayPath(notebook_path)
  if (verbose) {
    return (
      <>
        <FilePathLink filePath={notebook_path}>{displayPath}</FilePathLink>
        {`@${cell_id}, content: ${new_source.slice(0, 30)}…, cell_type: ${cell_type}, edit_mode: ${edit_mode ?? 'replace'}`}
      </>
    )
  }
  return (
    <>
      <FilePathLink filePath={notebook_path}>{displayPath}</FilePathLink>
      {`@${cell_id}`}
    </>
  )
}

export function renderToolUseRejectedMessage(
  input: Input,
  { verbose: _verbose }: { verbose: boolean },
): React.ReactNode {
  // FROM CC: NotebookEditToolUseRejectedMessage pending — fallback
  return (
    <Text dimColor>
      Notebook edit rejected: {input.notebook_path}@{input.cell_id}
    </Text>
  )
}

export function renderToolUseErrorMessage(
  result: ToolResultBlockParam['content'],
  { verbose }: { verbose: boolean },
): React.ReactNode {
  if (
    !verbose &&
    typeof result === 'string' &&
    extractTag(result, 'tool_use_error')
  ) {
    return (
      <MessageResponse>
        <Text color="error">Error editing notebook</Text>
      </MessageResponse>
    )
  }
  return <FallbackToolUseErrorMessage result={result} verbose={verbose} />
}

export function renderToolResultMessage({
  cell_id,
  new_source,
  error,
}: Output): React.ReactNode {
  if (error) {
    return (
      <MessageResponse>
        <Text color="error">{error}</Text>
      </MessageResponse>
    )
  }
  return (
    <MessageResponse>
      <Box flexDirection="column">
        <Text>
          Updated cell <Text bold>{cell_id}</Text>:
        </Text>
        <Box marginLeft={2}>
          {/* FROM CC: HighlightedCode pending — fallback to plain text */}
          <Text dimColor>{new_source}</Text>
        </Box>
      </Box>
    </MessageResponse>
  )
}
