/**
 * Horizontal divider line — adapted from CC's components/design-system/Divider.tsx
 *
 * Renders a full-width (or fixed-width) horizontal rule, optionally with a
 * centered title and theme color. Used between sections, as Pane borders, etc.
 */

import React from 'react'
import { Text } from 'ink'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'
import { stringWidth } from '../../ink/stringWidth.js'
import type { Theme } from '../../utils/theme.js'

type DividerProps = {
  /** Width override; defaults to terminal width */
  width?: number
  /** Theme color key */
  color?: keyof Theme
  /** Divider character; defaults to '─' */
  char?: string
  /** Subtract this many columns from effective width (for indented use) */
  padding?: number
  /** Centered title (may contain ANSI codes) */
  title?: string
}

export function Divider({ width, color, char = '─', padding = 0, title }: DividerProps): React.ReactNode {
  const { columns: terminalWidth } = useTerminalSize()
  const effectiveWidth = Math.max(0, (width ?? terminalWidth) - padding)

  if (title) {
    const titleWidth = stringWidth(title) + 2
    const sideWidth = Math.max(0, effectiveWidth - titleWidth)
    const leftWidth = Math.floor(sideWidth / 2)
    const rightWidth = sideWidth - leftWidth
    return (
      <Text color={color} dimColor={!color}>
        {char.repeat(leftWidth)}{' '}
        <Text dimColor>{title}</Text>{' '}
        {char.repeat(rightWidth)}
      </Text>
    )
  }

  return (
    <Text color={color} dimColor={!color}>
      {char.repeat(effectiveWidth)}
    </Text>
  )
}
