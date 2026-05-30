import type { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import * as React from 'react'
import { KeyboardShortcutHint } from '../../components/design-system/KeyboardShortcutHint.js'
import { FallbackToolUseErrorMessage } from '../../components/FallbackToolUseErrorMessage.js'
import { MessageResponse } from '../../components/MessageResponse.js'
import { ShellProgressMessage } from '../../components/shell/ShellProgressMessage.js'
import { Box, Text } from 'ink'
import { useKeybinding } from '../../keybindings/useKeybinding.js'
import { useShortcutDisplay } from '../../keybindings/useShortcutDisplay.js'
import { useAppStateStore, useSetAppState } from '../../state/AppState.js'
import type { Tool } from '../../Tool.js'
import type { ProgressMessage } from '../../types/message.js'
import { isEnvTruthy } from '../../utils/envUtils.js'
import { getDisplayPath } from '../../utils/file.js'
import { isFullscreenEnvEnabled } from '../../utils/fullscreen.js'
import type { ThemeName } from '../../utils/theme.js'
import BashToolResultMessage from './BashToolResultMessage.js'
import { extractBashCommentLabel } from './commentLabel.js'
import { parseSedEditCommand } from './sedEditParser.js'

// FROM CC: backgroundAll not yet ported (tasks/LocalShellTask pending)
const backgroundAll = (_getState: () => unknown, _setState: unknown) => {}

type BashToolInput = { command?: string }
type BashProgress = {
  type: string
  fullOutput: string
  output: string
  elapsedTimeSeconds?: number
  totalLines?: number
  totalBytes?: number
  timeoutMs?: number
  taskId?: string
}
type Out = {
  stdout?: string
  stderr?: string
  isImage?: boolean
  returnCodeInterpretation?: string
  noOutputExpected?: boolean
  backgroundTaskId?: string
}

const MAX_COMMAND_DISPLAY_LINES = 2
const MAX_COMMAND_DISPLAY_CHARS = 160

export function BackgroundHint({
  onBackground,
}: {
  onBackground?: () => void
} = {}): React.ReactElement | null {
  const store = useAppStateStore()
  const setAppState = useSetAppState()

  const handleBackground = React.useCallback(() => {
    backgroundAll(() => store.getState(), setAppState)
    onBackground?.()
  }, [store, setAppState, onBackground])

  useKeybinding('task:background', handleBackground, {
    context: 'Task',
  })

  const shortcut = useShortcutDisplay('task:background', 'Task', 'ctrl+b')

  if (isEnvTruthy(process.env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS)) {
    return null
  }

  return (
    <Box paddingLeft={5}>
      <Text dimColor>
        <KeyboardShortcutHint
          shortcut={shortcut}
          action="run in background"
          parens
        />
      </Text>
    </Box>
  )
}

export function renderToolUseMessage(
  input: Partial<BashToolInput>,
  { verbose, theme: _theme }: { verbose: boolean; theme: ThemeName },
): React.ReactNode {
  const { command } = input
  if (!command) {
    return null
  }

  const sedInfo = parseSedEditCommand(command)
  if (sedInfo) {
    return verbose ? sedInfo.filePath : getDisplayPath(sedInfo.filePath)
  }

  if (!verbose) {
    const lines = command.split('\n')

    if (isFullscreenEnvEnabled()) {
      const label = extractBashCommentLabel(command)
      if (label) {
        return label.length > MAX_COMMAND_DISPLAY_CHARS
          ? label.slice(0, MAX_COMMAND_DISPLAY_CHARS) + '…'
          : label
      }
    }

    const needsLineTruncation = lines.length > MAX_COMMAND_DISPLAY_LINES
    const needsCharTruncation = command.length > MAX_COMMAND_DISPLAY_CHARS

    if (needsLineTruncation || needsCharTruncation) {
      let truncated = command

      if (needsLineTruncation) {
        truncated = lines.slice(0, MAX_COMMAND_DISPLAY_LINES).join('\n')
      }

      if (truncated.length > MAX_COMMAND_DISPLAY_CHARS) {
        truncated = truncated.slice(0, MAX_COMMAND_DISPLAY_CHARS)
      }

      return <Text>{truncated.trim()}…</Text>
    }
  }

  return command
}

export function renderToolUseProgressMessage(
  progressMessagesForMessage: ProgressMessage<BashProgress>[],
  {
    verbose,
    tools: _tools,
    terminalSize: _terminalSize,
    inProgressToolCallCount: _inProgressToolCallCount,
  }: {
    tools: Tool[]
    verbose: boolean
    terminalSize?: { columns: number; rows: number }
    inProgressToolCallCount?: number
  },
): React.ReactNode {
  const lastProgress = progressMessagesForMessage.at(-1)

  if (!lastProgress || !lastProgress.data) {
    return (
      <MessageResponse height={1}>
        <Text dimColor>Running…</Text>
      </MessageResponse>
    )
  }

  const data = lastProgress.data

  return (
    <ShellProgressMessage
      fullOutput={data.fullOutput}
      output={data.output}
      elapsedTimeSeconds={data.elapsedTimeSeconds}
      totalLines={data.totalLines}
      totalBytes={data.totalBytes}
      timeoutMs={data.timeoutMs}
      taskId={data.taskId}
      verbose={verbose}
    />
  )
}

export function renderToolUseQueuedMessage(): React.ReactNode {
  return (
    <MessageResponse height={1}>
      <Text dimColor>Waiting…</Text>
    </MessageResponse>
  )
}

export function renderToolResultMessage(
  content: Out,
  progressMessagesForMessage: ProgressMessage<BashProgress>[],
  {
    verbose,
    theme: _theme,
    tools: _tools,
    style: _style,
  }: {
    verbose: boolean
    theme: ThemeName
    tools: Tool[]
    style?: 'condensed'
  },
): React.ReactNode {
  const lastProgress = progressMessagesForMessage.at(-1)
  const timeoutMs = lastProgress?.data?.timeoutMs
  return (
    <BashToolResultMessage
      content={content}
      verbose={verbose}
      timeoutMs={timeoutMs}
    />
  )
}

export function renderToolUseErrorMessage(
  result: ToolResultBlockParam['content'],
  {
    verbose,
    progressMessagesForMessage: _progressMessagesForMessage,
    tools: _tools,
  }: {
    verbose: boolean
    progressMessagesForMessage: ProgressMessage<BashProgress>[]
    tools: Tool[]
  },
): React.ReactNode {
  return <FallbackToolUseErrorMessage result={result} verbose={verbose} />
}
