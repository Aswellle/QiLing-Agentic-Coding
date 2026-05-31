import React from 'react'
import { Box } from 'ink'
import { renderToolUseProgressMessage } from '../tools/BashTool/UI.js'
import { ShellProgressMessage } from './shell/ShellProgressMessage.js'
import { UserBashInputMessage } from './messages/UserBashInputMessage.js'

// FROM CC: ShellProgress from types/tools.ts — inline type
type ShellProgress = {
  fullOutput: string
  output: string
  elapsedTimeSeconds: number
  totalLines: number
  totalBytes?: number
  timeoutMs?: number
  taskId?: string
}

type Props = {
  input: string
  progress: ShellProgress | null
  verbose: boolean
}

export function BashModeProgress({
  input,
  progress,
  verbose,
}: Props): React.ReactNode {
  return (
    <Box flexDirection="column" marginTop={1}>
      <UserBashInputMessage
        addMargin={false}
        text={`<bash-input>${input}</bash-input>`}
      />
      {progress ? (
        <ShellProgressMessage
          fullOutput={progress.fullOutput}
          output={progress.output}
          elapsedTimeSeconds={progress.elapsedTimeSeconds}
          totalLines={progress.totalLines}
          verbose={verbose}
        />
      ) : (
        renderToolUseProgressMessage([], {
          verbose,
          tools: [],
          terminalSize: undefined,
        })
      )}
    </Box>
  )
}
