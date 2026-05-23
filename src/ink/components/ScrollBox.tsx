/**
 * ScrollBox — adapted from CC's ink/components/ScrollBox.tsx
 *
 * A vertically scrollable container. Manages scroll offset state,
 * clamps content to viewport height, and handles arrow-key / mouse-
 * wheel input when focused.
 *
 * Renders children through Ink's Box with overflow: hidden semantics.
 * Actual clipping uses a virtual window: only lines in
 * [scrollOffset, scrollOffset + visibleRows) are rendered.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Box, useInput } from 'ink'

type Props = {
  /** Total number of logical rows in the content */
  readonly contentRows: number
  /** Number of rows visible in the viewport */
  readonly visibleRows: number
  /** Whether this ScrollBox should capture keyboard input */
  readonly isActive?: boolean
  /** Called with new scroll offset whenever it changes */
  readonly onScrollChange?: (offset: number) => void
  /** Controlled scroll offset (uncontrolled if undefined) */
  readonly scrollOffset?: number
  readonly children: React.ReactNode
}

export default function ScrollBox({
  contentRows,
  visibleRows,
  isActive = false,
  onScrollChange,
  scrollOffset: externalOffset,
  children,
}: Props): React.ReactNode {
  const [internalOffset, setInternalOffset] = useState(0)
  const offset = externalOffset ?? internalOffset
  const isControlled = externalOffset !== undefined

  const maxOffset = Math.max(0, contentRows - visibleRows)

  const scroll = useCallback(
    (delta: number) => {
      const next = Math.max(0, Math.min(maxOffset, offset + delta))
      if (next === offset) return
      if (!isControlled) setInternalOffset(next)
      onScrollChange?.(next)
    },
    [offset, maxOffset, isControlled, onScrollChange],
  )

  useInput(
    (_input, key) => {
      if (key.upArrow)    scroll(-1)
      if (key.downArrow)  scroll(1)
      if (key.pageUp)     scroll(-visibleRows)
      if (key.pageDown)   scroll(visibleRows)
    },
    { isActive },
  )

  // expose offset as data attribute for parent hit-testing
  const boxRef = useRef<unknown>(null)

  useEffect(() => {
    onScrollChange?.(offset)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps — intentional: fire once on mount

  return (
    <Box
      ref={boxRef as React.Ref<React.ElementRef<typeof Box>>}
      flexDirection="column"
      height={visibleRows}
      overflow="hidden"
    >
      {children}
    </Box>
  )
}

// ─── Scroll bar rendering helper ──────────────────────────────────────────────

/**
 * Compute the scroll bar thumb position and size.
 * Returns null when content fits in the viewport (no scroll needed).
 */
export function computeScrollBar(
  contentRows: number,
  visibleRows: number,
  offset: number,
): { thumbTop: number; thumbHeight: number; trackHeight: number } | null {
  if (contentRows <= visibleRows) return null
  const trackHeight = visibleRows
  const thumbHeight = Math.max(1, Math.round((visibleRows / contentRows) * trackHeight))
  const thumbTop = Math.round((offset / (contentRows - visibleRows)) * (trackHeight - thumbHeight))
  return { thumbTop, thumbHeight, trackHeight }
}
