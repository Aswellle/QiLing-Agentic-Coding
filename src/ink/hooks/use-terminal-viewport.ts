/**
 * Terminal viewport visibility hook — adapted from CC's ink/hooks/use-terminal-viewport.ts
 *
 * Returns a callback ref + live `isVisible` flag indicating whether the attached
 * component is currently within the terminal viewport. Visibility is computed in
 * a layout effect (fresh per render) to avoid stale Yoga reads.
 *
 * Does NOT trigger re-renders on visibility change — callers that re-render for
 * other reasons pick up the latest value naturally, avoiding infinite loops.
 */

import { useCallback, useLayoutEffect, useRef } from 'react'

type ViewportEntry = { isVisible: boolean }

export function useTerminalViewport(): [
  ref: (element: unknown) => void,
  entry: ViewportEntry,
] {
  const elementRef = useRef<unknown>(null)
  const entryRef = useRef<ViewportEntry>({ isVisible: true })

  const setElement = useCallback((el: unknown) => {
    elementRef.current = el
  }, [])

  useLayoutEffect(() => {
    const element = elementRef.current as { yogaNode?: { getComputedHeight(): number; getComputedTop(): number } } | null
    if (!element?.yogaNode) return

    const rows = process.stdout.rows ?? 24
    const height = element.yogaNode.getComputedHeight()
    const top = element.yogaNode.getComputedTop()
    const bottom = top + height
    const visible = bottom > 0 && top < rows

    if (visible !== entryRef.current.isVisible) {
      entryRef.current = { isVisible: visible }
    }
  })

  return [setElement, entryRef.current]
}
