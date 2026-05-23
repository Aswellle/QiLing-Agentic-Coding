/**
 * Overlay context — adapted from CC's context/overlayContext.tsx
 *
 * Tracks whether a full-screen overlay (PermissionDialog, PlanApprovalDialog,
 * ElicitationDialog, etc.) is currently mounted. Consumers can suppress
 * background interaction while an overlay is active.
 *
 * Separate from modalContext (which tracks Modal slot content dimensions).
 * An overlay covers the entire viewport; a modal is sized/positioned.
 */

import React, { createContext, useCallback, useContext, useState } from 'react'

export type OverlayState = {
  /** Number of currently mounted overlays (stacked modals). */
  depth: number
  /** True when at least one overlay is active. */
  isActive: boolean
}

type OverlayContextValue = {
  state: OverlayState
  push: () => void
  pop: () => void
}

const OverlayContext = createContext<OverlayContextValue | null>(null)

type Props = { children: React.ReactNode }

export function OverlayProvider({ children }: Props): React.ReactNode {
  const [depth, setDepth] = useState(0)

  const push = useCallback(() => setDepth(d => d + 1), [])
  const pop  = useCallback(() => setDepth(d => Math.max(0, d - 1)), [])

  const value: OverlayContextValue = {
    state: { depth, isActive: depth > 0 },
    push,
    pop,
  }

  return (
    <OverlayContext.Provider value={value}>
      {children}
    </OverlayContext.Provider>
  )
}

function useOverlayContext(): OverlayContextValue {
  const ctx = useContext(OverlayContext)
  if (!ctx) throw new Error('useOverlay must be used within OverlayProvider')
  return ctx
}

/** True when any overlay is currently mounted. */
export function useIsOverlayActive(): boolean {
  return useOverlayContext().state.isActive
}

/** Number of stacked overlays (0 = none). */
export function useOverlayDepth(): number {
  return useOverlayContext().state.depth
}

/**
 * Register as an active overlay. Increments depth on mount,
 * decrements on unmount.
 *
 * @example
 * function MyDialog() {
 *   useOverlayRegistration()
 *   return <Box>...</Box>
 * }
 */
export function useOverlayRegistration(): void {
  const { push, pop } = useOverlayContext()
  React.useEffect(() => {
    push()
    return pop
  }, [push, pop])
}
