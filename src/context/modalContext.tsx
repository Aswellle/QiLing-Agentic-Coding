/**
 * Modal context — adapted from CC's context/modalContext.tsx
 *
 * Set by FullscreenLayout when rendering content in its modal slot.
 * Consumers use this to suppress top-level framing and size content
 * correctly within the available modal space.
 */

import { createContext, type RefObject, useContext } from 'react'

type ModalCtx = {
  rows: number
  columns: number
  scrollRef?: RefObject<unknown | null>
}

export const ModalContext = createContext<ModalCtx | null>(null)

export function useIsInsideModal(): boolean {
  return useContext(ModalContext) !== null
}

/**
 * Available content rows/columns when inside a Modal.
 * Falls back to the provided terminal size when not inside a modal.
 */
export function useModalOrTerminalSize(fallback: { rows: number; columns: number }): {
  rows: number
  columns: number
} {
  const ctx = useContext(ModalContext)
  return ctx ? { rows: ctx.rows, columns: ctx.columns } : fallback
}
