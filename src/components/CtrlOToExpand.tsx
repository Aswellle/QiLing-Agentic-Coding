/**
 * CtrlOToExpand — adapted from CC's components/CtrlOToExpand.tsx
 *
 * Shows a "(ctrl+o to expand)" hint. No-op when inside a sub-agent or virtual list.
 * SubAgentProvider wraps sub-agent output to suppress nested hints.
 */

import chalk from 'chalk'
import React, { useContext } from 'react'
import { Text } from 'ink'
import { getShortcutDisplay } from '../keybindings/shortcutFormat.js'
import { useShortcutDisplay } from '../keybindings/useShortcutDisplay.js'
import { KeyboardShortcutHint } from './design-system/KeyboardShortcutHint.js'

const SubAgentContext = React.createContext(false)
// Stub for InVirtualListContext (not ported yet)
const InVirtualListContext = React.createContext(false)
export { InVirtualListContext }

export function SubAgentProvider({ children }: { children: React.ReactNode }): React.ReactNode {
  return <SubAgentContext.Provider value={true}>{children}</SubAgentContext.Provider>
}

export function CtrlOToExpand(): React.ReactNode {
  const isInSubAgent = useContext(SubAgentContext)
  const inVirtualList = useContext(InVirtualListContext)
  const expandShortcut = useShortcutDisplay('app:toggleTranscript', 'Global', 'ctrl+o')
  if (isInSubAgent || inVirtualList) return null
  return (
    <Text dimColor>
      <KeyboardShortcutHint shortcut={expandShortcut} action="expand" parens />
    </Text>
  )
}

export function ctrlOToExpand(): string {
  const shortcut = getShortcutDisplay('app:toggleTranscript', 'Global', 'ctrl+o')
  return chalk.dim(`(${shortcut} to expand)`)
}
