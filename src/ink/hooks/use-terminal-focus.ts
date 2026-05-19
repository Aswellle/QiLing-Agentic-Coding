/**
 * Terminal focus hook — adapted from CC's ink/hooks/use-terminal-focus.ts
 *
 * Returns true when the terminal has focus (or focus state is unknown).
 * Backed by DECSET 1004 focus reporting via TerminalFocusContext.
 */

import { useContext } from 'react'
import TerminalFocusContext from '../components/TerminalFocusContext.js'

export function useTerminalFocus(): boolean {
  const { isTerminalFocused } = useContext(TerminalFocusContext)
  return isTerminalFocused
}
