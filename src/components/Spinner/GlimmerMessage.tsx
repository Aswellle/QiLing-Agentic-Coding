/**
 * GlimmerMessage — adapted from CC's components/Spinner/GlimmerMessage.tsx
 *
 * Renders a spinner message with shimmer/flash/stall color animation.
 * Re-renders at ~20fps (glimmerIndex changes); grapheme segmentation is
 * memoized per message to avoid recomputing on every frame (-81% measured).
 */

import * as React from 'react'
import { Text } from 'ink'
import { stringWidth } from '../../ink/stringWidth.js'
import { useTheme } from '../design-system/ThemeProvider.js'
import { getGraphemeSegmenter } from '../../utils/intl.js'
import { getTheme, type Theme } from '../../utils/theme.js'
import type { SpinnerMode } from './types.js'
import { interpolateColor, parseRGB, toRGBColor } from './utils.js'

type Props = {
  message: string
  mode: SpinnerMode
  messageColor: keyof Theme
  glimmerIndex: number
  flashOpacity: number
  shimmerColor: keyof Theme
  stalledIntensity?: number
}

const ERROR_RED = { r: 171, g: 43, b: 63 }

export function GlimmerMessage({
  message,
  mode,
  messageColor,
  glimmerIndex,
  flashOpacity,
  shimmerColor,
  stalledIntensity = 0,
}: Props): React.ReactNode {
  const [themeName] = useTheme()
  const theme = getTheme(themeName)

  const { segments, messageWidth } = React.useMemo(() => {
    const segs: { segment: string; width: number }[] = []
    for (const { segment } of getGraphemeSegmenter().segment(message)) {
      segs.push({ segment, width: stringWidth(segment) })
    }
    return { segments: segs, messageWidth: stringWidth(message) }
  }, [message])

  if (!message) return null

  // When stalled, smoothly transition text color toward red
  if (stalledIntensity > 0) {
    const baseColorStr = theme[messageColor]
    const baseRGB = baseColorStr ? parseRGB(baseColorStr) : null

    if (baseRGB) {
      const interpolated = interpolateColor(baseRGB, ERROR_RED, stalledIntensity)
      const color = toRGBColor(interpolated)
      return (
        <>
          <Text color={color}>{message}</Text>
          <Text color={color}> </Text>
        </>
      )
    }

    // Fallback for ANSI themes: flip to 'error' at 50% stall intensity
    const color = stalledIntensity > 0.5 ? 'error' : messageColor
    return (
      <>
        <Text color={color}>{message}</Text>
        <Text color={color}> </Text>
      </>
    )
  }

  // tool-use mode: all chars flash at the same opacity — single <Text> is cheaper
  if (mode === 'tool-use') {
    const baseColorStr = theme[messageColor]
    const shimmerColorStr = theme[shimmerColor]
    const baseRGB = baseColorStr ? parseRGB(baseColorStr) : null
    const shimmerRGB = shimmerColorStr ? parseRGB(shimmerColorStr) : null

    if (baseRGB && shimmerRGB) {
      const interpolated = interpolateColor(baseRGB, shimmerRGB, flashOpacity)
      return (
        <>
          <Text color={toRGBColor(interpolated)}>{message}</Text>
          <Text color={messageColor}> </Text>
        </>
      )
    }

    const color = flashOpacity > 0.5 ? shimmerColor : messageColor
    return (
      <>
        <Text color={color}>{message}</Text>
        <Text color={messageColor}> </Text>
      </>
    )
  }

  // Shimmer mode: only chars within ±1 of glimmerIndex get the shimmer color
  const shimmerStart = glimmerIndex - 1
  const shimmerEnd = glimmerIndex + 1

  if (shimmerStart >= messageWidth || shimmerEnd < 0) {
    return (
      <>
        <Text color={messageColor}>{message}</Text>
        <Text color={messageColor}> </Text>
      </>
    )
  }

  const clampedStart = Math.max(0, shimmerStart)
  let colPos = 0
  let before = ''
  let shim = ''
  let after = ''
  for (const { segment, width } of segments) {
    if (colPos + width <= clampedStart) {
      before += segment
    } else if (colPos > shimmerEnd) {
      after += segment
    } else {
      shim += segment
    }
    colPos += width
  }

  return (
    <>
      {before && <Text color={messageColor}>{before}</Text>}
      <Text color={shimmerColor}>{shim}</Text>
      {after && <Text color={messageColor}>{after}</Text>}
      <Text color={messageColor}> </Text>
    </>
  )
}
