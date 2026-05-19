/**
 * Terminal size context — adapted from CC's ink/components/TerminalSizeContext.tsx
 *
 * Provides terminal dimensions (columns/rows) to components via React Context.
 * Set by the App component using process.stdout.columns/rows.
 */

import { createContext } from 'react'

export type TerminalSize = {
  columns: number
  rows: number
}

export const TerminalSizeContext = createContext<TerminalSize | null>(null)
