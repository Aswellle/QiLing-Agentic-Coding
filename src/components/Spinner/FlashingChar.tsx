/**
 * FlashingChar — adapted from CC's components/Spinner/FlashingChar.tsx
 *
 * Renders a single character that smoothly interpolates between two theme colors
 * based on a flash opacity [0, 1]. Falls back to binary switching for ANSI themes.
 */

import React from 'react'
import { Text } from 'ink'
import { getTheme, type Theme } from '../../utils/theme.js'
import { useTheme } from '../design-system/ThemeProvider.js'
import { interpolateColor, parseRGB, toRGBColor } from './utils.js'

type Props = {
  char: string
  flashOpacity: number
  messageColor: keyof Theme
  shimmerColor: keyof Theme
}

export function FlashingChar({ char, flashOpacity, messageColor, shimmerColor }: Props): React.ReactNode {
  const [themeName] = useTheme()
  const theme = getTheme(themeName)

  const baseColorStr = theme[messageColor]
  const shimmerColorStr = theme[shimmerColor]

  const baseRGB = baseColorStr ? parseRGB(baseColorStr) : null
  const shimmerRGB = shimmerColorStr ? parseRGB(shimmerColorStr) : null

  if (baseRGB && shimmerRGB) {
    const interpolated = interpolateColor(baseRGB, shimmerRGB, flashOpacity)
    return <Text color={toRGBColor(interpolated)}>{char}</Text>
  }

  const shouldUseShimmer = flashOpacity > 0.5
  return <Text color={shouldUseShimmer ? shimmerColor : messageColor}>{char}</Text>
}
