/**
 * Terminal size hook — adapted from CC's hooks/useTerminalSize.ts
 *
 * Returns current terminal dimensions from TerminalSizeContext (set by App).
 * Throws if used outside an Ink App component.
 */

// FROM CC: use TerminalSizeContext (provided by App) instead of direct process.stdout polling
import { useContext } from 'react'
import { type TerminalSize, TerminalSizeContext } from '../ink/components/TerminalSizeContext.js'

export type { TerminalSize }

export function useTerminalSize(): TerminalSize {
  const size = useContext(TerminalSizeContext)

  if (!size) {
    throw new Error('useTerminalSize must be used within an Ink App component')
  }

  return size
}
