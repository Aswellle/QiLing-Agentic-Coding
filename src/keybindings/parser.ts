import type { ParsedKeystroke, ParsedChord } from './types'

// Modifier aliases — map various names to canonical modifier fields
const MODIFIER_ALIASES: Record<string, keyof Pick<ParsedKeystroke, 'ctrl' | 'alt' | 'shift' | 'meta' | 'super'>> = {
  ctrl: 'ctrl',
  control: 'ctrl',
  alt: 'alt',
  option: 'alt',
  opt: 'alt',
  meta: 'meta',
  shift: 'shift',
  cmd: 'meta',
  command: 'meta',
  super: 'super',
  win: 'super',
}

// Normalize key names to canonical form
function normalizeKeyName(k: string): string {
  const lower = k.toLowerCase()
  if (lower === 'esc') return 'escape'
  if (lower === 'return') return 'enter'
  if (lower === 'del') return 'delete'
  return lower
}

/**
 * Parse a single keystroke string like "ctrl+shift+k", "tab", "shift+tab",
 * "ctrl+shift+-" into a ParsedKeystroke.
 *
 * Handles edge case: "ctrl+shift+-" means ctrl+shift and the minus key.
 * Strategy: split on '+', the last segment is always the key (even if empty
 * which would mean '+' itself), rest are modifiers.
 */
export function parseKeystroke(raw: string): ParsedKeystroke {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new Error(`Empty keystroke string`)
  }

  // Split by '+' — but we need to handle the case where '+' is the key itself
  // e.g. "ctrl++" means ctrl+plus, "ctrl+shift++" means ctrl+shift+plus
  // Strategy: split normally, if the last segment is empty and the string ends
  // with '+', the key is '+' (plus)
  const parts = trimmed.split('+')

  // If ends with '+', pop empty string and use '+' as key
  let keyPart: string
  let modParts: string[]

  if (parts.length >= 2 && parts[parts.length - 1] === '') {
    // e.g. "ctrl++" → ['ctrl', '', ''] after split... handle gracefully
    modParts = parts.slice(0, -2).filter(p => p !== '')
    keyPart = '+'
  } else {
    keyPart = parts[parts.length - 1]!
    modParts = parts.slice(0, -1)
  }

  const ks: ParsedKeystroke = {
    key: normalizeKeyName(keyPart),
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    super: false,
  }

  for (const mod of modParts) {
    const normalized = mod.toLowerCase().trim()
    const field = MODIFIER_ALIASES[normalized]
    if (!field) {
      throw new Error(`Unknown modifier: "${mod}" in keystroke "${raw}"`)
    }
    ks[field] = true
  }

  // Validate: key must be non-empty
  if (!ks.key) {
    throw new Error(`No key in keystroke "${raw}"`)
  }

  return ks
}

/**
 * Parse a chord string — space-separated keystrokes.
 * e.g. "ctrl+x ctrl+s" → [parseKeystroke("ctrl+x"), parseKeystroke("ctrl+s")]
 * e.g. "ctrl+shift+k" → [parseKeystroke("ctrl+shift+k")]
 */
export function parseChord(raw: string): ParsedChord {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new Error(`Empty chord string`)
  }
  return trimmed.split(/\s+/).map(parseKeystroke)
}

/**
 * Reconstruct canonical string from ParsedKeystroke.
 * Order: ctrl+alt+shift+meta+super+key
 */
export function keystrokeToString(k: ParsedKeystroke): string {
  const parts: string[] = []
  if (k.ctrl) parts.push('ctrl')
  if (k.alt) parts.push('alt')
  if (k.shift) parts.push('shift')
  if (k.meta) parts.push('meta')
  if (k.super) parts.push('super')
  parts.push(k.key)
  return parts.join('+')
}

export function chordToString(chord: ParsedChord): string {
  return chord.map(keystrokeToString).join(' ')
}

/**
 * Platform-aware display string.
 * macOS: ⌘ ⌥ ⌃ ⇧
 * Others: Ctrl Alt Shift Win
 */
export function keystrokeToDisplayString(k: ParsedKeystroke, platform?: string): string {
  const isMac = (platform ?? process.platform) === 'darwin'

  const parts: string[] = []

  if (isMac) {
    if (k.ctrl) parts.push('⌃')
    if (k.alt) parts.push('⌥')
    if (k.shift) parts.push('⇧')
    if (k.meta) parts.push('⌘')
    if (k.super) parts.push('⊞')
  } else {
    if (k.ctrl) parts.push('Ctrl')
    if (k.alt) parts.push('Alt')
    if (k.shift) parts.push('Shift')
    if (k.meta) parts.push('Meta')
    if (k.super) parts.push('Win')
  }

  // Display key name
  const keyDisplay: Record<string, string> = {
    tab: 'Tab',
    escape: 'Esc',
    enter: 'Enter',
    backspace: '⌫',
    delete: 'Del',
    up: '↑',
    down: '↓',
    left: '←',
    right: '→',
    pageup: 'PgUp',
    pagedown: 'PgDn',
    home: 'Home',
    end: 'End',
    space: 'Space',
  }

  const displayKey = keyDisplay[k.key] ?? k.key.toUpperCase()

  if (isMac) {
    return parts.join('') + displayKey
  }
  return [...parts, displayKey].join('+')
}

export function chordToDisplayString(chord: ParsedChord, platform?: string): string {
  return chord.map(k => keystrokeToDisplayString(k, platform)).join(' ')
}
