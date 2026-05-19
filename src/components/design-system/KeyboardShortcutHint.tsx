/**
 * Keyboard shortcut hint component — adapted from CC's components/design-system/KeyboardShortcutHint.tsx
 *
 * Renders a keyboard shortcut hint like "ctrl+o to expand" or "(tab to toggle)".
 * Wrap in <Text dimColor> for the common dim styling.
 *
 * @example
 * <Text dimColor><KeyboardShortcutHint shortcut="esc" action="cancel" /></Text>
 * <Text dimColor><KeyboardShortcutHint shortcut="ctrl+o" action="expand" parens /></Text>
 * <Text dimColor><KeyboardShortcutHint shortcut="Enter" action="confirm" bold /></Text>
 */

import React from 'react'
import { Text } from 'ink'

type Props = {
  /** The key or chord to display (e.g., "ctrl+o", "Enter", "↑/↓") */
  shortcut: string
  /** The action the key performs (e.g., "expand", "select", "navigate") */
  action: string
  /** Whether to wrap the hint in parentheses. Default: false */
  parens?: boolean
  /** Whether to render the shortcut in bold. Default: false */
  bold?: boolean
}

export function KeyboardShortcutHint({
  shortcut,
  action,
  parens = false,
  bold = false,
}: Props): React.ReactNode {
  const shortcutText = bold ? <Text bold>{shortcut}</Text> : shortcut

  if (parens) {
    return (
      <Text>
        ({shortcutText} to {action})
      </Text>
    )
  }
  return (
    <Text>
      {shortcutText} to {action}
    </Text>
  )
}
