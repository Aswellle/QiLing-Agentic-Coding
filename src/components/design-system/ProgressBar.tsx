/**
 * Progress bar component — adapted from CC's components/design-system/ProgressBar.tsx
 *
 * Renders a block-style progress bar using Unicode block characters.
 * Sub-character precision using partial block characters (▏▎▍▌▋▊▉█).
 *
 * @example
 * <ProgressBar ratio={0.7} width={20} fillColor="success" />
 */

import React from 'react'
import { Text } from 'ink'

type Props = {
  /** Progress ratio, 0 to 1 inclusive */
  ratio: number
  /** Width in characters */
  width: number
  /** Color for the filled portion */
  fillColor?: string
  /** Color for the empty portion */
  emptyColor?: string
}

const BLOCKS = [' ', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█']

export function ProgressBar({ ratio: inputRatio, width, fillColor, emptyColor }: Props): React.ReactNode {
  const ratio = Math.min(1, Math.max(0, inputRatio))
  const whole = Math.floor(ratio * width)
  const segments = [BLOCKS[BLOCKS.length - 1]!.repeat(whole)]

  if (whole < width) {
    const remainder = ratio * width - whole
    const middle = Math.floor(remainder * BLOCKS.length)
    segments.push(BLOCKS[middle]!)
    const empty = width - whole - 1
    if (empty > 0) segments.push(BLOCKS[0]!.repeat(empty))
  }

  return (
    <Text color={fillColor} backgroundColor={emptyColor}>
      {segments.join('')}
    </Text>
  )
}
