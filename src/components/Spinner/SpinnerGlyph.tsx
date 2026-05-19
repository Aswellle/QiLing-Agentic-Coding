/**
 * SpinnerGlyph — adapted from CC's components/Spinner/SpinnerGlyph.tsx
 *
 * Renders a single spinning character that:
 * - Cycles through braille-like frames in both directions (wave effect)
 * - Smoothly interpolates to red when stalled (stalledIntensity 0→1)
 * - Falls back to a slowly-flashing dot in reduced-motion mode
 */

import React from 'react'
import { Box, Text } from 'ink'
import { getTheme, type Theme } from '../../utils/theme.js'
import { useTheme } from '../design-system/ThemeProvider.js'
import { getDefaultCharacters, interpolateColor, parseRGB, toRGBColor } from './utils.js'

const DEFAULT_CHARACTERS = getDefaultCharacters()
const SPINNER_FRAMES = [...DEFAULT_CHARACTERS, ...[...DEFAULT_CHARACTERS].reverse()]
const REDUCED_MOTION_DOT = '●'
const REDUCED_MOTION_CYCLE_MS = 2000
const ERROR_RED = { r: 171, g: 43, b: 63 }

type Props = {
  frame: number
  messageColor: keyof Theme
  stalledIntensity?: number
  reducedMotion?: boolean
  time?: number
}

export function SpinnerGlyph({
  frame,
  messageColor,
  stalledIntensity = 0,
  reducedMotion = false,
  time = 0,
}: Props): React.ReactNode {
  const [themeName] = useTheme()
  const theme = getTheme(themeName)

  if (reducedMotion) {
    const isDim = Math.floor(time / (REDUCED_MOTION_CYCLE_MS / 2)) % 2 === 1
    return (
      <Box flexWrap="nowrap" height={1} width={2}>
        <Text color={messageColor} dimColor={isDim}>{REDUCED_MOTION_DOT}</Text>
      </Box>
    )
  }

  const spinnerChar = SPINNER_FRAMES[frame % SPINNER_FRAMES.length]

  if (stalledIntensity > 0) {
    const baseColorStr = theme[messageColor]
    const baseRGB = baseColorStr ? parseRGB(baseColorStr) : null
    if (baseRGB) {
      const interpolated = interpolateColor(baseRGB, ERROR_RED, stalledIntensity)
      return (
        <Box flexWrap="nowrap" height={1} width={2}>
          <Text color={toRGBColor(interpolated)}>{spinnerChar}</Text>
        </Box>
      )
    }
    const color = stalledIntensity > 0.5 ? 'red' : messageColor
    return <Box flexWrap="nowrap" height={1} width={2}><Text color={color}>{spinnerChar}</Text></Box>
  }

  return <Box flexWrap="nowrap" height={1} width={2}><Text color={messageColor}>{spinnerChar}</Text></Box>
}
