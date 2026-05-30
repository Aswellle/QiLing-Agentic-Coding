import type { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import * as React from 'react'
import { MessageResponse } from '../../components/MessageResponse.js'
import { extractTag } from '../../utils/messages.js'
import { FallbackToolUseErrorMessage } from '../../components/FallbackToolUseErrorMessage.js'
import { FilePathLink } from '../../components/FilePathLink.js'
import { Text } from 'ink'
import type { ProgressMessage } from '../../types/message.js'
import { FILE_NOT_FOUND_CWD_NOTE, getDisplayPath } from '../../utils/file.js'
import { getPlansDirectory } from '../../utils/plans.js'
import { firstLineOf } from '../../utils/stringUtils.js'
import type { ThemeName } from '../../utils/theme.js'
import type { FileEditOutput } from './types.js'

// FROM CC: FileEditToolUpdatedMessage not yet ported (components/FileEditToolUpdatedMessage.tsx)
// FROM CC: FileEditToolUseRejectedMessage not yet ported (components/FileEditToolUseRejectedMessage.tsx)

type Input = {
  file_path?: string
  old_string?: string
  new_string?: string
  replace_all?: boolean
  edits?: unknown[]
}

export function userFacingName(input: Partial<Input> | undefined): string {
  if (!input) return 'Update'
  if (input.file_path?.startsWith(getPlansDirectory())) return 'Updated plan'
  if (input.edits != null) return 'Update'
  if (input.old_string === '') return 'Create'
  return 'Update'
}

export function getToolUseSummary(
  input: Partial<Input> | undefined,
): string | null {
  if (!input?.file_path) return null
  return getDisplayPath(input.file_path)
}

export function renderToolUseMessage(
  { file_path }: { file_path?: string },
  { verbose }: { verbose: boolean },
): React.ReactNode {
  if (!file_path) return null
  if (file_path.startsWith(getPlansDirectory())) return ''
  return (
    <FilePathLink filePath={file_path}>
      {verbose ? file_path : getDisplayPath(file_path)}
    </FilePathLink>
  )
}

export function renderToolResultMessage(
  { filePath, structuredPatch }: FileEditOutput,
  _progressMessagesForMessage: ProgressMessage[],
  { verbose: _verbose }: { style?: 'condensed'; verbose: boolean },
): React.ReactNode {
  // FROM CC: FileEditToolUpdatedMessage pending — show simplified result
  const totalLines = structuredPatch?.reduce(
    (sum: number, h: { lines?: unknown[] }) => sum + (h.lines?.length ?? 0),
    0,
  ) ?? 0
  return (
    <MessageResponse height={1}>
      <Text>
        Updated{' '}
        <FilePathLink filePath={filePath}>{getDisplayPath(filePath)}</FilePathLink>
        {totalLines > 0 ? <Text dimColor> ({totalLines} line change)</Text> : null}
      </Text>
    </MessageResponse>
  )
}

export function renderToolUseRejectedMessage(
  input: {
    file_path: string
    old_string?: string
    new_string?: string
    replace_all?: boolean
    edits?: unknown[]
  },
  { verbose, style: _style }: { verbose: boolean; style?: 'condensed'; theme?: ThemeName },
): React.ReactElement {
  // FROM CC: FileEditToolUseRejectedMessage pending — show simplified rejection
  const filePath = input.file_path
  const newString = input.new_string ?? ''
  const preview = firstLineOf(newString)
  return (
    <MessageResponse>
      <Text color="warning">
        Edit rejected:{' '}
        <FilePathLink filePath={filePath}>{getDisplayPath(filePath)}</FilePathLink>
        {!verbose && preview ? <Text dimColor> "{preview}"</Text> : null}
      </Text>
    </MessageResponse>
  ) as React.ReactElement
}

export function renderToolUseErrorMessage(
  result: ToolResultBlockParam['content'],
  { verbose }: { verbose: boolean },
): React.ReactElement {
  if (!verbose && typeof result === 'string' && extractTag(result, 'tool_use_error')) {
    const errorMessage = extractTag(result, 'tool_use_error')
    if (errorMessage?.includes('File has not been read yet')) {
      return (
        <MessageResponse>
          <Text dimColor>File must be read first</Text>
        </MessageResponse>
      ) as React.ReactElement
    }
    if (errorMessage?.includes(FILE_NOT_FOUND_CWD_NOTE)) {
      return (
        <MessageResponse>
          <Text color="error">File not found</Text>
        </MessageResponse>
      ) as React.ReactElement
    }
    return (
      <MessageResponse>
        <Text color="error">Error editing file</Text>
      </MessageResponse>
    ) as React.ReactElement
  }
  return <FallbackToolUseErrorMessage result={result} verbose={verbose} />
}
