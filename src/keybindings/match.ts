import type { Key } from 'ink'
import type { ParsedKeystroke, ParsedBinding } from './types'

/**
 * Extract a normalized key name from Ink's input/key objects.
 * Ink represents special keys in the key object (tab, escape, up, down, etc.)
 * and regular chars in the input string.
 *
 * Note: Ink's Key type does NOT have 'alt' or 'super' fields.
 * It uses 'meta' for the Alt/Option key on most terminals.
 */
export function getKeyName(input: string, key: Key): string | null {
  if (key.tab) return 'tab'
  if (key.escape) return 'escape'
  if (key.return) return 'enter'
  if (key.backspace) return 'backspace'
  if (key.delete) return 'delete'
  if (key.upArrow) return 'up'
  if (key.downArrow) return 'down'
  if (key.leftArrow) return 'left'
  if (key.rightArrow) return 'right'
  if (key.pageUp) return 'pageup'
  if (key.pageDown) return 'pagedown'
  if (input === ' ') return 'space'
  if (input.length === 1) return input.toLowerCase()
  return null
}

/**
 * Check that modifier keys match between a ParsedKeystroke and Ink's Key.
 *
 * Alt and meta are treated as equivalent — on most terminals, the Alt key
 * sends an ESC prefix that Ink interprets as key.meta=true. Our ParsedKeystroke
 * distinguishes them in the type but matches either to Ink's key.meta.
 */
export function modifiersMatch(ks: ParsedKeystroke, key: Key): boolean {
  // Ink uses key.meta for Alt on most terminals; treat alt and meta as equivalent
  const keyAltOrMeta = key.meta
  const ksAltOrMeta = ks.alt || ks.meta

  // Ink does not have a 'super' field; super bindings can never match via Ink
  if (ks.super) return false

  return ks.ctrl === !!key.ctrl
    && ks.shift === !!key.shift
    && ksAltOrMeta === !!keyAltOrMeta
}

/**
 * Check whether an Ink input+key event matches a single ParsedKeystroke.
 */
export function matchesKeystroke(input: string, key: Key, ks: ParsedKeystroke): boolean {
  const keyName = getKeyName(input, key)
  if (!keyName) return false
  if (keyName !== ks.key) return false
  return modifiersMatch(ks, key)
}

/**
 * Check whether an Ink input+key event matches the first keystroke of a binding.
 * For single-keystroke bindings this is a full match.
 * For chord bindings (length > 1) this only matches the first step.
 */
export function matchesBinding(input: string, key: Key, binding: ParsedBinding): boolean {
  // Only matches single-keystroke bindings directly
  if (binding.chord.length !== 1) return false
  const ks = binding.chord[0]!
  return matchesKeystroke(input, key, ks)
}
