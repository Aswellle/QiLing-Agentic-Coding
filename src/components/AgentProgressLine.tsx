/**
 * AgentProgressLine — adapted from CC's components/AgentProgressLine.tsx
 *
 * Renders a single agent in the agent-tree view (├─ / └─ format).
 * Shows tool-use count, token count, and last-tool status or "Done".
 * Backgrounded async agents show their task description instead.
 */

import React from 'react'
import { Box, Text } from 'ink'
import { formatNumber } from '../utils/format.js'
import type { Theme } from '../utils/theme.js'

type Props = {
  agentType: string
  description?: string
  name?: string
  descriptionColor?: keyof Theme
  taskDescription?: string
  toolUseCount: number
  tokens: number | null
  color?: keyof Theme
  isLast: boolean
  isResolved: boolean
  isError: boolean
  isAsync?: boolean
  shouldAnimate: boolean
  lastToolInfo?: string | null
  hideType?: boolean
}

export function AgentProgressLine({
  agentType,
  description,
  name,
  descriptionColor,
  taskDescription,
  toolUseCount,
  tokens,
  color,
  isLast,
  isResolved,
  isAsync = false,
  lastToolInfo,
  hideType = false,
}: Props): React.ReactNode {
  const treeChar = isLast ? '└─' : '├─'
  const isBackgrounded = isAsync && isResolved

  const statusText = !isResolved
    ? (lastToolInfo || 'Initializing…')
    : isBackgrounded
      ? (taskDescription ?? 'Running in the background')
      : 'Done'

  return (
    <Box flexDirection="column">
      <Box paddingLeft={3}>
        <Text dimColor>{treeChar} </Text>
        <Text dimColor={!isResolved}>
          {hideType ? (
            <>
              <Text bold>{name ?? description ?? agentType}</Text>
              {name && description && <Text dimColor>: {description}</Text>}
            </>
          ) : (
            <>
              <Text bold backgroundColor={color} color={color ? 'white' : undefined}>
                {agentType}
              </Text>
              {description && (
                <>
                  {' ('}
                  <Text backgroundColor={descriptionColor} color={descriptionColor ? 'white' : undefined}>
                    {description}
                  </Text>
                  {')'}
                </>
              )}
            </>
          )}
          {!isBackgrounded && (
            <>
              {' · '}
              {toolUseCount} tool {toolUseCount === 1 ? 'use' : 'uses'}
              {tokens !== null && <> · {formatNumber(tokens)} tokens</>}
            </>
          )}
        </Text>
      </Box>
      {!isBackgrounded && (
        <Box paddingLeft={3} flexDirection="row">
          <Text dimColor>{isLast ? '   ⎿  ' : '│  ⎿  '}</Text>
          <Text dimColor>{statusText}</Text>
        </Box>
      )}
    </Box>
  )
}
