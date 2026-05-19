/**
 * Non-selectable content wrapper — adapted from CC's ink/components/NoSelect.tsx
 *
 * Marks content as non-selectable in fullscreen text selection mode.
 * Used for gutters (line numbers, diff sigils, list bullets) so drag-select
 * over code yields clean pasteable content without gutter characters.
 *
 * In QiLing: simplified Box wrapper (no-op when alt-screen not active).
 */

import React, { type PropsWithChildren } from 'react'
import { Box } from 'ink'

type Props = {
  /** Extend exclusion from left edge (for gutters inside indented containers) */
  fromLeftEdge?: boolean
  [key: string]: unknown
}

export function NoSelect({ children, fromLeftEdge: _fromLeftEdge, ...boxProps }: PropsWithChildren<Props>): React.ReactNode {
  return <Box {...boxProps as Record<string, unknown>}>{children}</Box>
}
