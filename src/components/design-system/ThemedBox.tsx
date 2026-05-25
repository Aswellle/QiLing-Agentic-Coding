/**
 * ThemedBox — adapted from CC's components/design-system/ThemedBox.tsx
 *
 * Theme-aware Box that resolves theme color keys to raw hex/RGB colors.
 * Accepts both `keyof Theme` strings and raw color values for border/background.
 */

import React, { type PropsWithChildren } from 'react'
import { Box } from 'ink'
import type { BoxProps } from 'ink'
import { getTheme, type Theme } from '../../utils/theme.js'
import { useTheme } from './ThemeProvider.js'

type ThemedColorProps = {
  readonly borderColor?: keyof Theme | string
  readonly borderTopColor?: keyof Theme | string
  readonly borderBottomColor?: keyof Theme | string
  readonly borderLeftColor?: keyof Theme | string
  readonly borderRightColor?: keyof Theme | string
  readonly backgroundColor?: keyof Theme | string
}

export type Props = Omit<
  BoxProps,
  'borderColor' | 'borderTopColor' | 'borderBottomColor' | 'borderLeftColor' | 'borderRightColor' | 'backgroundColor'
> & ThemedColorProps

function resolveColor(color: string | undefined, theme: Theme): string | undefined {
  if (!color) return undefined
  // FROM CC: detect raw color values before theme key lookup
  if (color.startsWith('rgb(') || color.startsWith('#') || color.startsWith('ansi256(') || color.startsWith('ansi:')) {
    return color
  }
  if (color in theme) return theme[color as keyof Theme]
  return color
}

function ThemedBox({
  borderColor,
  borderTopColor,
  borderBottomColor,
  borderLeftColor,
  borderRightColor,
  backgroundColor,
  children,
  ...rest
}: PropsWithChildren<Props>): React.ReactNode {
  const [themeName] = useTheme()
  const theme = getTheme(themeName)

  return (
    <Box
      borderColor={resolveColor(borderColor, theme)}
      borderTopColor={resolveColor(borderTopColor, theme)}
      borderBottomColor={resolveColor(borderBottomColor, theme)}
      borderLeftColor={resolveColor(borderLeftColor, theme)}
      borderRightColor={resolveColor(borderRightColor, theme)}
      {...rest}
    >
      {children}
    </Box>
  )
}

export default ThemedBox
