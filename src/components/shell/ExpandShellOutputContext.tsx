/**
 * Shell output expansion context — adapted from CC's components/shell/ExpandShellOutputContext.tsx
 *
 * When active, shell output should be shown in full (not truncated).
 * Used to auto-expand the most recent user ! command output.
 */

import React, { useContext } from 'react'

const ExpandShellOutputContext = React.createContext(false)

export function ExpandShellOutputProvider({
  children,
}: {
  children: React.ReactNode
}): React.ReactNode {
  return (
    <ExpandShellOutputContext.Provider value={true}>
      {children}
    </ExpandShellOutputContext.Provider>
  )
}

/**
 * Returns true when inside an ExpandShellOutputProvider,
 * indicating shell output should be shown in full rather than truncated.
 */
export function useExpandShellOutput(): boolean {
  return useContext(ExpandShellOutputContext)
}
