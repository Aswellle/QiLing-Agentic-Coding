/**
 * Tool use loading indicator — adapted from CC's components/ToolUseLoader.tsx
 *
 * A blinking/status dot shown next to tool calls in the REPL.
 * Uses useBlink() so all instances animate in sync.
 */

import React from 'react'
import { Box, Text } from 'ink'
import { BLACK_CIRCLE } from '../constants/figures.js'
import { useBlink } from '../hooks/useBlink.js'

type Props = {
  isError: boolean
  isUnresolved: boolean
  shouldAnimate: boolean
}

export function ToolUseLoader({ isError, isUnresolved, shouldAnimate }: Props): React.ReactNode {
  const [ref, isBlinking] = useBlink(shouldAnimate)

  const color = isUnresolved ? undefined : isError ? 'red' : 'green'

  // WARNING: dim→bold adjacency can cause rendering artifacts in chalk
  // where </dim> and </bold> both use \x1b[22m. Keep dimColor and bold separate.
  return (
    <Box minWidth={2}>
      <Text color={color} dimColor={isUnresolved}>
        {!shouldAnimate || isBlinking || isError || !isUnresolved
          ? BLACK_CIRCLE
          : ' '}
      </Text>
    </Box>
  )
}
