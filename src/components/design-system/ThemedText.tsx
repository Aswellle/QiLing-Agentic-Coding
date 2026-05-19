/**
 * ThemedText — adapted from CC's components/design-system/ThemedText.tsx
 *
 * Theme-aware Text that resolves theme color keys to raw colors.
 * Supports dimColor via theme.inactive, hoverColor via context.
 */

import React, { useContext } from 'react'
import type { ReactNode } from 'react'
import { Text } from 'ink'
import { getTheme, type Theme } from '../../utils/theme.js'
import { useTheme } from './ThemeProvider.js'

export const TextHoverColorContext = React.createContext<keyof Theme | undefined>(undefined)

export type Props = {
  readonly color?: keyof Theme | string
  readonly backgroundColor?: keyof Theme | string
  readonly dimColor?: boolean
  readonly bold?: boolean
  readonly italic?: boolean
  readonly underline?: boolean
  readonly strikethrough?: boolean
  readonly inverse?: boolean
  readonly wrap?: 'wrap' | 'truncate' | 'truncate-start' | 'truncate-middle' | 'truncate-end'
  readonly children?: ReactNode
}

function resolveColor(color: string | undefined, theme: Theme): string | undefined {
  if (!color) return undefined
  if (color in theme) return theme[color as keyof Theme]
  return color
}

export default function ThemedText({
  color,
  backgroundColor,
  dimColor = false,
  bold = false,
  italic = false,
  underline = false,
  strikethrough = false,
  inverse = false,
  wrap = 'wrap',
  children,
}: Props): React.ReactNode {
  const [themeName] = useTheme()
  const theme = getTheme(themeName)
  const hoverColor = useContext(TextHoverColorContext)

  const resolvedColor = !color && hoverColor
    ? resolveColor(hoverColor, theme)
    : dimColor
      ? theme.inactive
      : resolveColor(color, theme)

  const resolvedBg = backgroundColor ? resolveColor(backgroundColor, theme) : undefined

  return (
    <Text
      color={resolvedColor}
      backgroundColor={resolvedBg}
      bold={bold}
      italic={italic}
      underline={underline}
      strikethrough={strikethrough}
      inverse={inverse}
      wrap={wrap}
    >
      {children}
    </Text>
  )
}
