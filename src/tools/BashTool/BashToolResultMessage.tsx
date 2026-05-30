import React from 'react'
import { removeSandboxViolationTags } from '../../utils/sandbox/sandbox-ui-utils.js'
import { KeyboardShortcutHint } from '../../components/design-system/KeyboardShortcutHint.js'
import { MessageResponse } from '../../components/MessageResponse.js'
import { OutputLine } from '../../components/shell/OutputLine.js'
import { ShellTimeDisplay } from '../../components/shell/ShellTimeDisplay.js'
import { Box, Text } from 'ink'

type BashContent = {
  stdout?: string
  stderr?: string
  isImage?: boolean
  returnCodeInterpretation?: string
  noOutputExpected?: boolean
  backgroundTaskId?: string
}

type Props = {
  content: BashContent
  verbose: boolean
  timeoutMs?: number
}

// Pattern to match "Shell cwd was reset to <path>" message
const SHELL_CWD_RESET_PATTERN = /(?:^|\n)(Shell cwd was reset to .+)$/

function extractSandboxViolations(stderr: string): { cleanedStderr: string } {
  const violationsMatch = stderr.match(
    /<sandbox_violations>([\s\S]*?)<\/sandbox_violations>/,
  )
  if (!violationsMatch) {
    return { cleanedStderr: stderr }
  }
  const cleanedStderr = removeSandboxViolationTags(stderr).trim()
  return { cleanedStderr }
}

function extractCwdResetWarning(stderr: string): {
  cleanedStderr: string
  cwdResetWarning: string | null
} {
  const match = stderr.match(SHELL_CWD_RESET_PATTERN)
  if (!match) {
    return { cleanedStderr: stderr, cwdResetWarning: null }
  }
  const cwdResetWarning = match[1] ?? null
  const cleanedStderr = stderr.replace(SHELL_CWD_RESET_PATTERN, '').trim()
  return { cleanedStderr, cwdResetWarning }
}

export default function BashToolResultMessage({
  content: {
    stdout = '',
    stderr: stdErrWithViolations = '',
    isImage,
    returnCodeInterpretation,
    noOutputExpected,
    backgroundTaskId,
  },
  verbose,
  timeoutMs,
}: Props): React.ReactNode {
  const { cleanedStderr: stderrWithoutViolations } =
    extractSandboxViolations(stdErrWithViolations)

  const { cleanedStderr: stderr, cwdResetWarning } = extractCwdResetWarning(
    stderrWithoutViolations,
  )

  if (isImage) {
    return (
      <MessageResponse height={1}>
        {/* // NAME: Claude - agent name in image detection message */}
        <Text dimColor>[Image data detected and sent to Claude]</Text>
      </MessageResponse>
    )
  }

  return (
    <Box flexDirection="column">
      {stdout !== '' ? <OutputLine content={stdout} verbose={verbose} /> : null}
      {stderr.trim() !== '' ? (
        <OutputLine content={stderr} verbose={verbose} isError />
      ) : null}
      {cwdResetWarning ? (
        <MessageResponse>
          <Text dimColor>{cwdResetWarning}</Text>
        </MessageResponse>
      ) : null}
      {stdout === '' && stderr.trim() === '' && !cwdResetWarning ? (
        <MessageResponse height={1}>
          <Text dimColor>
            {backgroundTaskId ? (
              <>
                Running in the background{' '}
                <KeyboardShortcutHint shortcut="↓" action="manage" parens />
              </>
            ) : (
              returnCodeInterpretation ||
              (noOutputExpected ? 'Done' : '(No output)')
            )}
          </Text>
        </MessageResponse>
      ) : null}
      {timeoutMs ? (
        <MessageResponse>
          <ShellTimeDisplay timeoutMs={timeoutMs} />
        </MessageResponse>
      ) : null}
    </Box>
  )
}
