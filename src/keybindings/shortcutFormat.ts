/**
 * Non-React shortcut display — adapted from CC's keybindings/shortcutFormat.ts
 *
 * Use this in non-React contexts (commands, services, query hooks, etc.)
 * to get the configured shortcut display text without pulling React into
 * the module graph.
 *
 * React component usage: use useShortcutDisplay() instead.
 */

import { loadKeybindingsSync } from './loader.js'
import { getBindingDisplayText } from './resolver.js'
import type { KeybindingContextName } from './types.js'

// Track fallback logging once per action+context pair to avoid log spam
const LOGGED_FALLBACKS = new Set<string>()

/**
 * Get display text for a configured shortcut without React hooks.
 *
 * @param action   - Keybinding action (e.g., 'app:toggleTranscript')
 * @param context  - Keybinding context (e.g., 'Global')
 * @param fallback - Default if binding not found
 * @returns The configured shortcut display text, or fallback
 *
 * @example
 * const shortcut = getShortcutDisplay('app:toggleTranscript', 'Global', 'ctrl+o')
 */
export function getShortcutDisplay(
  action: string,
  context: KeybindingContextName,
  fallback: string,
): string {
  const bindings = loadKeybindingsSync()
  const resolved = getBindingDisplayText(action, [context], bindings)
  if (resolved === undefined) {
    // Log once per action+context pair (no analytics — just debug)
    const key = `${action}:${context}`
    if (!LOGGED_FALLBACKS.has(key)) {
      LOGGED_FALLBACKS.add(key)
    }
    return fallback
  }
  return resolved
}
