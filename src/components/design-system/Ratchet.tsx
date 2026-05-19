/**
 * Ratchet — adapted from CC's components/design-system/Ratchet.tsx
 *
 * Prevents height reduction (a visual "ratchet"): once the children reach a
 * maximum height, the container maintains at least that height even if content
 * shrinks. Used to stop streaming content from collapsing mid-render.
 *
 * `lock='always'` — always hold minHeight (default)
 * `lock='offscreen'` — only hold when element is scrolled off screen
 */

import React, { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Box } from 'ink'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'
import { useTerminalViewport } from '../../ink/hooks/use-terminal-viewport.js'
import measureElement from '../../ink/measure-element.js'

type Props = {
  children: React.ReactNode
  lock?: 'always' | 'offscreen'
}

export function Ratchet({ children, lock = 'always' }: Props): React.ReactNode {
  const [viewportRef, { isVisible }] = useTerminalViewport()
  const { rows } = useTerminalSize()
  const innerRef = useRef<unknown>(null)
  const maxHeight = useRef(0)
  const [minHeight, setMinHeight] = useState(0)

  const outerRef = useCallback(
    (el: unknown) => { viewportRef(el) },
    [viewportRef],
  )

  const engaged = lock === 'always' || !isVisible

  useLayoutEffect(() => {
    if (!innerRef.current) return
    const { height } = measureElement(innerRef.current as Parameters<typeof measureElement>[0])
    if (height > maxHeight.current) {
      maxHeight.current = Math.min(height, rows)
      setMinHeight(maxHeight.current)
    }
  })

  return (
    <Box minHeight={engaged ? minHeight : undefined} ref={outerRef as (el: unknown) => void}>
      {/* biome-ignore lint: internal ref type cast */}
      <Box ref={innerRef as unknown as React.RefObject<import('ink').DOMElement>} flexDirection="column">
        {children}
      </Box>
    </Box>
  )
}
