import * as React from 'react'
import { Box, Text } from 'ink'
import type { ToolProgressData } from '../../types/tool.js'
import type { ProgressMessage } from '../../types/message.js'
import type { ThemeName } from '../../utils/theme.js'

type Output = { action: string; worktreeBranch?: string; originalCwd: string }

export function renderToolUseMessage(): React.ReactNode {
  return 'Exiting worktree…'
}

export function renderToolResultMessage(
  output: Output,
  _progressMessagesForMessage: ProgressMessage<ToolProgressData>[],
  _options: { theme: ThemeName },
): React.ReactNode {
  const actionLabel =
    output.action === 'keep' ? 'Kept worktree' : 'Removed worktree'
  return (
    <Box flexDirection="column">
      <Text>
        {actionLabel}
        {output.worktreeBranch ? (
          <>
            {' '}
            (branch <Text bold>{output.worktreeBranch}</Text>)
          </>
        ) : null}
      </Text>
      <Text dimColor>Returned to {output.originalCwd}</Text>
    </Box>
  )
}
