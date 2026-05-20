/**
 * OffscreenFreeze — adapted from CC's components/OffscreenFreeze.tsx
 *
 * Freezes children when they scroll above the terminal viewport (into scrollback).
 * Returns a cached ReactElement reference, preventing re-renders and avoiding
 * full terminal resets from timer-driven updates (spinners, elapsed counters).
 * One-slot cache: updates resume immediately when content scrolls back into view.
 */

import React, { useRef } from 'react'
import { Box } from 'ink'
import { useTerminalViewport } from '../ink/hooks/use-terminal-viewport.js'
import { InVirtualListContext } from './CtrlOToExpand.js'

type Props = { children: React.ReactNode }

export function OffscreenFreeze({ children }: Props): React.ReactNode {
  const inVirtualList = React.useContext(InVirtualListContext)
  const [ref, { isVisible }] = useTerminalViewport()
  const cached = useRef(children)

  if (isVisible || inVirtualList) cached.current = children

  return <Box ref={ref as unknown as React.RefObject<import('ink').DOMElement>}>{cached.current}</Box>
}
