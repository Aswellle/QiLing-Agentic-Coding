/**
 * ListItem — adapted from CC's components/design-system/ListItem.tsx
 *
 * Standard list item for selection UIs with focus/selection states,
 * scroll indicators, and optional description text.
 *
 * Indicators: ❯ (focused), ✓ (selected), ↓ / ↑ (scroll hints).
 */

import React from 'react'
import type { ReactNode } from 'react'
import { Box, Text } from 'ink'

const POINTER = '❯'
const CHECK = '✓'
const SCROLL_DOWN = '↓'
const SCROLL_UP = '↑'

type ListItemProps = {
  isFocused: boolean
  isSelected?: boolean
  children: ReactNode
  description?: string
  showScrollDown?: boolean
  showScrollUp?: boolean
  styled?: boolean
  disabled?: boolean
}

export function ListItem({
  isFocused,
  isSelected = false,
  children,
  description,
  showScrollDown,
  showScrollUp,
  styled = true,
  disabled = false,
}: ListItemProps): React.ReactNode {
  let indicator = ' '
  if (disabled) {
    indicator = ' '
  } else if (isFocused) {
    indicator = POINTER
  } else if (isSelected) {
    indicator = CHECK
  } else if (showScrollDown) {
    indicator = SCROLL_DOWN
  } else if (showScrollUp) {
    indicator = SCROLL_UP
  }

  const indicatorColor = isFocused ? 'cyan' : isSelected ? 'green' : undefined
  const indicatorDim = !isFocused && !isSelected && !showScrollDown && !showScrollUp

  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Box width={2} flexShrink={0}>
          <Text color={indicatorColor} dimColor={indicatorDim}>{indicator} </Text>
        </Box>
        <Box flexGrow={1}>
          {styled ? (
            <Text
              color={disabled ? undefined : isFocused ? 'cyan' : isSelected ? 'green' : undefined}
              dimColor={disabled}
            >
              {children}
            </Text>
          ) : (
            children
          )}
        </Box>
      </Box>
      {description && (
        <Box paddingLeft={2}>
          <Text dimColor>{description}</Text>
        </Box>
      )}
    </Box>
  )
}
