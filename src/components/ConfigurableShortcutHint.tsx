/**
 * ConfigurableShortcutHint — adapted from CC's components/ConfigurableShortcutHint.tsx
 *
 * Shows a KeyboardShortcutHint using the user-configured binding for an action.
 * Falls back to the default shortcut if keybinding context is not configured.
 */

import React from 'react'
import type { KeybindingContextName } from '../keybindings/types.js'
type KeybindingAction = string
import { useShortcutDisplay } from '../keybindings/useShortcutDisplay.js'
import { KeyboardShortcutHint } from './design-system/KeyboardShortcutHint.js'

type Props = {
  action: KeybindingAction
  context: KeybindingContextName
  fallback: string
  description: string
  parens?: boolean
  bold?: boolean
}

export function ConfigurableShortcutHint({ action, context, fallback, description, parens, bold }: Props): React.ReactNode {
  const shortcut = useShortcutDisplay(action, context, fallback)
  return <KeyboardShortcutHint shortcut={shortcut} action={description} parens={parens} bold={bold} />
}
