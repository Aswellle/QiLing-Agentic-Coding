/**
 * IdeStatusIndicator — adapted from CC's components/IdeStatusIndicator.tsx
 *
 * Shows IDE selection context (N lines selected / file open) when IDE is connected.
 */

import { basename } from 'path'
import React from 'react'
import { Text } from 'ink'
import { useIdeConnectionStatus } from '../hooks/useIdeConnectionStatus.js'
import type { MCPServerConnection } from '../services/mcp/types.js'

type IDESelection = {
  filePath?: string
  text?: string
  lineCount?: number
}

type Props = {
  ideSelection: IDESelection | undefined
  mcpClients?: MCPServerConnection[]
}

export function IdeStatusIndicator({ ideSelection, mcpClients }: Props): React.ReactNode {
  const { status: ideStatus } = useIdeConnectionStatus(mcpClients)

  const shouldShow = ideStatus === 'connected' && (ideSelection?.filePath || (ideSelection?.text && (ideSelection.lineCount ?? 0) > 0))
  if (ideStatus === null || !shouldShow || !ideSelection) return null

  if (ideSelection.text && (ideSelection.lineCount ?? 0) > 0) {
    return (
      <Text color="cyan" wrap="truncate">
        ⧉ {ideSelection.lineCount} {ideSelection.lineCount === 1 ? 'line' : 'lines'} selected
      </Text>
    )
  }

  if (ideSelection.filePath) {
    return <Text color="cyan" wrap="truncate">⧉ In {basename(ideSelection.filePath)}</Text>
  }
}
