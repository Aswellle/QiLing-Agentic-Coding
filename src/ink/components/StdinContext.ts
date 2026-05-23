/**
 * StdinContext — adapted from CC's ink/components/StdinContext.ts
 *
 * React context providing the active stdin stream.
 * Used by useInput and keybinding hooks to attach raw-mode listeners.
 *
 * QiLing: thin adapter — Ink 5 manages its own stdin context internally.
 * This module re-exports a compatible context shape so CC-pattern imports
 * resolve. Consumers should prefer Ink 5's useInput() directly.
 */

import { createContext, useContext } from 'react'

export type StdinContextValue = {
  readonly stdin: NodeJS.ReadableStream
  /** True when raw mode is active on stdin */
  readonly isRawModeSupported: boolean
  readonly setRawMode: (enabled: boolean) => void
  readonly internal_exitOnCtrlC: boolean
}

const DEFAULT_STDIN_CTX: StdinContextValue = {
  stdin: process.stdin,
  isRawModeSupported: typeof (process.stdin as NodeJS.ReadStream).setRawMode === 'function',
  setRawMode: (enabled: boolean) => {
    const s = process.stdin as NodeJS.ReadStream
    if (typeof s.setRawMode === 'function') s.setRawMode(enabled)
  },
  internal_exitOnCtrlC: true,
}

export const StdinContext = createContext<StdinContextValue>(DEFAULT_STDIN_CTX)

export function useStdin(): StdinContextValue {
  return useContext(StdinContext)
}
