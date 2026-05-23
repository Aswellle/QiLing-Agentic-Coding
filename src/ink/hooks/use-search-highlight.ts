/**
 * use-search-highlight — adapted from CC's ink/hooks/use-search-highlight.ts
 *
 * Hook that applies search highlight overlays to the rendered screen.
 * Depends on ink/searchHighlight.ts (already ported as a stub) and
 * ink/screen.ts (B-T4-13, not yet ported).
 *
 * QiLing stub: returns no-op operations until screen.ts is available.
 * Phase B-T4-13: replace stub bodies with real screen highlight calls.
 */

export type SearchHighlightState = {
  /** The current search query (empty string = no highlight). */
  query: string
  /** Total matches found in the current frame. */
  matchCount: number
  /** Index of the focused match (0-based). */
  focusedMatch: number
}

export type SearchHighlightHook = {
  state: SearchHighlightState
  setQuery: (query: string) => void
  nextMatch: () => void
  prevMatch: () => void
  clearQuery: () => void
}

const NO_OP_HOOK: SearchHighlightHook = {
  state: { query: '', matchCount: 0, focusedMatch: 0 },
  setQuery: () => {},
  nextMatch: () => {},
  prevMatch: () => {},
  clearQuery: () => {},
}

/**
 * Manage search highlight state.
 * Returns no-op operations until ink/screen.ts is ported (B-T4-13).
 */
export function useSearchHighlight(): SearchHighlightHook {
  // QiLing stub: wire to real screen.ts highlight in B-T4-13
  return NO_OP_HOOK
}
