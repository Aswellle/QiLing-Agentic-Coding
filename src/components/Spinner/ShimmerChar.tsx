/**
 * Shimmer character component — adapted from CC's components/Spinner/ShimmerChar.tsx
 *
 * Renders a single character that smoothly shifts between two colors
 * based on its position relative to the current shimmer/glimmer index.
 * Adjacent characters to the highlight get partial shimmer effect.
 */

import React from 'react'
import { Text } from 'ink'

type Props = {
  char: string
  index: number
  glimmerIndex: number
  messageColor: string
  shimmerColor: string
}

export function ShimmerChar({
  char,
  index,
  glimmerIndex,
  messageColor,
  shimmerColor,
}: Props): React.ReactNode {
  const isHighlighted = index === glimmerIndex
  const isNearHighlight = Math.abs(index - glimmerIndex) === 1
  const shouldUseShimmer = isHighlighted || isNearHighlight

  return (
    <Text color={shouldUseShimmer ? shimmerColor : messageColor}>{char}</Text>
  )
}
