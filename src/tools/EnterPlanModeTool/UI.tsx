import * as React from 'react'
import { BLACK_CIRCLE } from '../../constants/figures.js'
import { getModeColor } from '../../utils/permissions/PermissionMode.js'
import { Box, Text } from 'ink'
import type { ToolProgressData } from '../../types/tool.js'
import type { ProgressMessage } from '../../types/message.js'
import type { ThemeName } from '../../utils/theme.js'

export function renderToolUseMessage(): React.ReactNode {
  return null
}

export function renderToolResultMessage(
  _output: unknown,
  _progressMessagesForMessage: ProgressMessage<ToolProgressData>[],
  _options: { theme: ThemeName },
): React.ReactNode {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box flexDirection="row">
        <Text color={getModeColor('plan')}>{BLACK_CIRCLE}</Text>
        <Text> Entered plan mode</Text>
      </Box>
      <Box paddingLeft={2}>
        <Text dimColor>
          {/* // NAME: Claude Code - agent name in plan mode message */}
          Claude is now exploring and designing an implementation approach.
        </Text>
      </Box>
    </Box>
  )
}

export function renderToolUseRejectedMessage(): React.ReactNode {
  return (
    <Box flexDirection="row" marginTop={1}>
      <Text color={getModeColor('default')}>{BLACK_CIRCLE}</Text>
      <Text> User declined to enter plan mode</Text>
    </Box>
  )
}
