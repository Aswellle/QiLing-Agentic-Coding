/**
 * Button — adapted from CC's ink/components/Button.tsx
 *
 * A focusable, keyboard-activatable terminal button.
 * Renders with label + optional keyboard hint.
 * Supports: Enter/Space to activate, focus highlighting.
 */

import React from 'react'
import { Box, Text, useInput } from 'ink'
import { useFocus } from 'ink'

type Props = {
  readonly label: string
  readonly onClick: () => void
  /** Shown dimmed after the label, e.g. "(y/n)" */
  readonly hint?: string
  readonly disabled?: boolean
  /** Auto-focus when mounted */
  readonly autoFocus?: boolean
  /** Override focus ID (for programmatic focus management) */
  readonly id?: string
}

export default function Button({ label, onClick, hint, disabled = false, autoFocus = false, id }: Props): React.ReactNode {
  const { isFocused } = useFocus({ autoFocus, id })

  useInput(
    (input, key) => {
      if (disabled) return
      if (key.return || input === ' ') onClick()
    },
    { isActive: isFocused },
  )

  return (
    <Box>
      <Text
        bold={isFocused && !disabled}
        color={disabled ? 'gray' : isFocused ? 'cyan' : undefined}
        underline={isFocused && !disabled}
      >
        {label}
      </Text>
      {hint && (
        <Text dimColor> {hint}</Text>
      )}
    </Box>
  )
}
