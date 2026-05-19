/**
 * Loading state spinner component — adapted from CC's components/design-system/LoadingState.tsx
 *
 * A spinner with loading message for async operations in dialogs and panels.
 *
 * @example
 * <LoadingState message="Loading sessions..." />
 * <LoadingState message="Connecting" bold subtitle="Please wait" />
 */

import React from 'react'
import { Box, Text } from 'ink'

type LoadingStateProps = {
  /** The loading message to display next to the spinner */
  message: string
  /** Display the message in bold. @default false */
  bold?: boolean
  /** Display the message in dimmed color. @default false */
  dimColor?: boolean
  /** Optional subtitle displayed below the main message */
  subtitle?: string
}

export function LoadingState({
  message,
  bold = false,
  dimColor = false,
  subtitle,
}: LoadingStateProps): React.ReactNode {
  return (
    <Box flexDirection="column" gap={1}>
      <Box gap={1}>
        <Text dimColor>⣾</Text>
        <Text bold={bold} dimColor={dimColor}>
          {message}
        </Text>
      </Box>
      {subtitle && (
        <Box marginLeft={3}>
          <Text dimColor>{subtitle}</Text>
        </Box>
      )}
    </Box>
  )
}
