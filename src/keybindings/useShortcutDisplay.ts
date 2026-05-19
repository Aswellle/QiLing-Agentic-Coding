/**
 * React hook for shortcut display — adapted from CC's keybindings/useShortcutDisplay.ts
 *
 * Returns the configured shortcut display text for a keybinding action.
 * Falls back to the provided default if the binding is not configured.
 *
 * Non-React usage: use getShortcutDisplay() from shortcutFormat.ts instead.
 *
 * @example
 * const expandShortcut = useShortcutDisplay('app:toggleTranscript', 'Global', 'ctrl+o')
 * // Returns the user's configured binding, or 'ctrl+o' as default
 */

import { useMemo } from 'react'
import { loadKeybindingsSync } from './loader.js'
import { getBindingDisplayText } from './resolver.js'
import type { KeybindingContextName } from './types.js'

export function useShortcutDisplay(
  action: string,
  context: KeybindingContextName,
  fallback: string,
): string {
  return useMemo(() => {
    const bindings = loadKeybindingsSync()
    const resolved = getBindingDisplayText(action, [context], bindings)
    return resolved ?? fallback
  }, [action, context, fallback])
}
