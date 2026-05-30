import type { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import { relative } from 'path'
import * as React from 'react'
import { MessageResponse } from '../../components/MessageResponse.js'
import { extractTag } from '../../utils/messages.js'
import { CtrlOToExpand } from '../../components/CtrlOToExpand.js'
import { FallbackToolUseErrorMessage } from '../../components/FallbackToolUseErrorMessage.js'
import { FilePathLink } from '../../components/FilePathLink.js'
import { Box, Text } from 'ink'
import type { ToolProgressData } from '../../types/tool.js'
import type { ProgressMessage } from '../../types/message.js'
import { getCwd } from '../../utils/cwd.js'
import { getDisplayPath } from '../../utils/file.js'
import { getPlansDirectory } from '../../utils/plans.js'

// FROM CC: FileEditToolUpdatedMessage not yet ported
// FROM CC: FileEditToolUseRejectedMessage not yet ported
// FROM CC: HighlightedCode not yet ported — show line count only for create

const MAX_LINES_TO_RENDER = 10
const EOL = '\n'

export function countLines(content: string): number {
  const parts = content.split(EOL)
  return content.endsWith(EOL) ? parts.length - 1 : parts.length
}

type Output = {
  type: 'create' | 'update'
  filePath: string
  content: string
  structuredPatch?: unknown[]
  originalFile?: string
}

export function isResultTruncated({ type, content }: Output): boolean {
  if (type !== 'create') return false
  let pos = 0
  for (let i = 0; i < MAX_LINES_TO_RENDER; i++) {
    pos = content.indexOf(EOL, pos)
    if (pos === -1) return false
    pos++
  }
  return pos < content.length
}

export function userFacingName(
  input: Partial<{ file_path: string; content: string }> | undefined,
): string {
  if (input?.file_path?.startsWith(getPlansDirectory())) return 'Updated plan'
  return 'Write'
}

export function getToolUseSummary(
  input: Partial<{ file_path: string; content: string }> | undefined,
): string | null {
  if (!input?.file_path) return null
  return getDisplayPath(input.file_path)
}

export function renderToolUseMessage(
  input: Partial<{ file_path: string; content: string }>,
  { verbose }: { verbose: boolean },
): React.ReactNode {
  if (!input.file_path) return null
  if (input.file_path.startsWith(getPlansDirectory())) return ''
  return (
    <FilePathLink filePath={input.file_path}>
      {verbose ? input.file_path : getDisplayPath(input.file_path)}
    </FilePathLink>
  )
}

export function renderToolUseRejectedMessage(
  { file_path, content }: { file_path: string; content: string },
  { verbose, style: _style }: { style?: 'condensed'; verbose: boolean },
): React.ReactNode {
  // FROM CC: WriteRejectionDiff pending (needs readEditContext + FileEditToolUseRejectedMessage)
  const numLines = countLines(content)
  return (
    <MessageResponse>
      <Text color="warning">
        Write rejected:{' '}
        <FilePathLink filePath={file_path}>{getDisplayPath(file_path)}</FilePathLink>
        {!verbose ? <Text dimColor> ({numLines} lines)</Text> : null}
      </Text>
    </MessageResponse>
  )
}

export function renderToolUseErrorMessage(
  result: ToolResultBlockParam['content'],
  { verbose }: { verbose: boolean },
): React.ReactNode {
  if (!verbose && typeof result === 'string' && extractTag(result, 'tool_use_error')) {
    return (
      <MessageResponse>
        <Text color="error">Error writing file</Text>
      </MessageResponse>
    )
  }
  return <FallbackToolUseErrorMessage result={result} verbose={verbose} />
}

export function renderToolResultMessage(
  { filePath, content, structuredPatch: _structuredPatch, type }: Output,
  _progressMessagesForMessage: ProgressMessage<ToolProgressData>[],
  { style, verbose }: { style?: 'condensed'; verbose: boolean },
): React.ReactNode {
  switch (type) {
    case 'create': {
      const isPlanFile = filePath.startsWith(getPlansDirectory())

      if (isPlanFile && !verbose) {
        if (style !== 'condensed') {
          return (
            <MessageResponse>
              <Text dimColor>/plan to preview</Text>
            </MessageResponse>
          )
        }
      } else if (style === 'condensed' && !verbose) {
        const numLines = countLines(content)
        return (
          <Text>
            Wrote <Text bold>{numLines}</Text> lines to{' '}
            <Text bold>{relative(getCwd(), filePath)}</Text>
          </Text>
        )
      }

      // FROM CC: FileWriteToolCreatedMessage (HighlightedCode) pending — show line count
      const numLines = countLines(content)
      const displayLines = verbose ? content : content.split('\n').slice(0, MAX_LINES_TO_RENDER).join('\n')
      const plusLines = numLines - MAX_LINES_TO_RENDER
      return (
        <MessageResponse>
          <Box flexDirection="column">
            <Text>
              Wrote <Text bold>{numLines}</Text> lines to{' '}
              <Text bold>{verbose ? filePath : relative(getCwd(), filePath)}</Text>
            </Text>
            <Box flexDirection="column">
              <Text dimColor>{displayLines}</Text>
            </Box>
            {!verbose && plusLines > 0 && (
              <Text dimColor>
                … +{plusLines} {plusLines === 1 ? 'line' : 'lines'}{' '}
                {numLines > 0 && <CtrlOToExpand />}
              </Text>
            )}
          </Box>
        </MessageResponse>
      )
    }
    case 'update': {
      // FROM CC: FileEditToolUpdatedMessage pending
      return (
        <MessageResponse height={1}>
          <Text>
            Updated{' '}
            <FilePathLink filePath={filePath}>
              {getDisplayPath(filePath)}
            </FilePathLink>
          </Text>
        </MessageResponse>
      )
    }
  }
}
