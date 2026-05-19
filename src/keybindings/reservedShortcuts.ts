/**
 * Reserved shortcuts — adapted from CC's keybindings/reservedShortcuts.ts
 *
 * OS/terminal/shell shortcuts that cannot be rebound, plus platform-specific
 * shortcuts that are intercepted before they reach the application.
 */

export type ReservedShortcut = {
  key: string
  reason: string
  severity: 'error' | 'warning'
}

export const NON_REBINDABLE: ReservedShortcut[] = [
  { key: 'ctrl+c', reason: 'Cannot be rebound - used for interrupt/exit (hardcoded)', severity: 'error' },
  { key: 'ctrl+d', reason: 'Cannot be rebound - used for exit (hardcoded)', severity: 'error' },
  { key: 'ctrl+m', reason: 'Cannot be rebound - identical to Enter in terminals (both send CR)', severity: 'error' },
]

export const TERMINAL_RESERVED: ReservedShortcut[] = [
  { key: 'ctrl+z', reason: 'Unix process suspend (SIGTSTP)', severity: 'warning' },
  { key: 'ctrl+\\', reason: 'Terminal quit signal (SIGQUIT)', severity: 'error' },
]

export const MACOS_RESERVED: ReservedShortcut[] = [
  { key: 'cmd+c', reason: 'macOS system copy', severity: 'error' },
  { key: 'cmd+v', reason: 'macOS system paste', severity: 'error' },
  { key: 'cmd+x', reason: 'macOS system cut', severity: 'error' },
  { key: 'cmd+q', reason: 'macOS quit application', severity: 'error' },
  { key: 'cmd+w', reason: 'macOS close window/tab', severity: 'error' },
  { key: 'cmd+tab', reason: 'macOS app switcher', severity: 'error' },
  { key: 'cmd+space', reason: 'macOS Spotlight', severity: 'error' },
]

export function getReservedShortcuts(): ReservedShortcut[] {
  const reserved = [...NON_REBINDABLE, ...TERMINAL_RESERVED]
  if (process.platform === 'darwin') {
    reserved.push(...MACOS_RESERVED)
  }
  return reserved
}

/**
 * Normalize a key string for comparison (lowercase, sorted modifiers).
 * Chords (space-separated steps) are normalized per-step.
 */
export function normalizeKeyForComparison(key: string): string {
  return key.trim().split(/\s+/).map(normalizeStep).join(' ')
}

function normalizeStep(step: string): string {
  const parts = step.split('+')
  const modifiers: string[] = []
  let mainKey = ''

  for (const part of parts) {
    const lower = part.trim().toLowerCase()
    if (['ctrl', 'alt', 'shift', 'meta', 'cmd', 'super'].includes(lower)) {
      modifiers.push(lower)
    } else {
      mainKey = lower
    }
  }

  return [...modifiers.sort(), mainKey].filter(Boolean).join('+')
}
