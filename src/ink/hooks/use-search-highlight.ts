/**
 * use-search-highlight — adapted from CC's ink/hooks/use-search-highlight.ts
 *
 * Manages search query state. The render pipeline calls applySearchHighlight()
 * from searchHighlight.ts each frame to paint matches onto the screen buffer.
 */

import { useCallback, useState } from 'react'

export type SearchHighlightState = {
  /** The current search query (empty string = no highlight). */
  query: string
  /** Total matches found in the current frame (updated by render pipeline). */
  matchCount: number
  /** Index of the focused match (0-based). */
  focusedMatch: number
}

export type SearchHighlightHook = {
  state: SearchHighlightState
  setQuery: (query: string) => void
  /** Update matchCount from the render pipeline after scanning the screen. */
  setMatchCount: (count: number) => void
  nextMatch: () => void
  prevMatch: () => void
  clearQuery: () => void
}

export function useSearchHighlight(): SearchHighlightHook {
  const [state, setState] = useState<SearchHighlightState>({
    query: '', matchCount: 0, focusedMatch: 0,
  })

  const setQuery = useCallback((query: string) => {
    setState({ query, matchCount: 0, focusedMatch: 0 })
  }, [])

  const setMatchCount = useCallback((count: number) => {
    setState(s => ({ ...s, matchCount: count, focusedMatch: Math.min(s.focusedMatch, Math.max(0, count - 1)) }))
  }, [])

  const nextMatch = useCallback(() => {
    setState(s => ({
      ...s,
      focusedMatch: s.matchCount > 0 ? (s.focusedMatch + 1) % s.matchCount : 0,
    }))
  }, [])

  const prevMatch = useCallback(() => {
    setState(s => ({
      ...s,
      focusedMatch: s.matchCount > 0 ? (s.focusedMatch - 1 + s.matchCount) % s.matchCount : 0,
    }))
  }, [])

  const clearQuery = useCallback(() => {
    setState({ query: '', matchCount: 0, focusedMatch: 0 })
  }, [])

  return { state, setQuery, setMatchCount, nextMatch, prevMatch, clearQuery }
}
