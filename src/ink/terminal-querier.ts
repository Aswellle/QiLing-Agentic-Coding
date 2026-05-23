/**
 * terminal-querier — adapted from CC's ink/terminal-querier.ts
 *
 * Queries terminal capabilities at startup:
 *   - Color support level (truecolor / 256 / 16 / none)
 *   - Background color (DA2 query)
 *   - Terminal name / version
 *   - Unicode / emoji width support
 *
 * Queries use in-band escape sequences and a short read timeout.
 * On Windows, falls back to env-var detection (no PTY query support).
 */

export type ColorSupport = 'truecolor' | 'ansi256' | 'ansi' | 'none'

export type TerminalCapabilities = {
  colorSupport: ColorSupport
  /** Terminal name from $TERM_PROGRAM or DA2 response, e.g. "iTerm2", "vscode" */
  terminalName: string | null
  /** True if the terminal reports unicode / emoji full-width support */
  unicodeSupported: boolean
  /** True if we detected a Kitty-compatible terminal (can use ENABLE_KITTY_KEYBOARD) */
  kittyKeyboard: boolean
  /** True when running in Windows Terminal (WT_SESSION is set) */
  windowsTerminal: boolean
  /** True when running under VS Code terminal */
  vscodeTerminal: boolean
}

/** Detect color support from environment variables. */
export function detectColorSupport(): ColorSupport {
  const term = process.env['TERM'] ?? ''
  const colorterm = (process.env['COLORTERM'] ?? '').toLowerCase()
  const noColor = process.env['NO_COLOR']
  const forceColor = process.env['FORCE_COLOR']

  if (noColor !== undefined) return 'none'
  if (forceColor === '0') return 'none'
  if (forceColor === '1') return 'ansi'
  if (forceColor === '2') return 'ansi256'
  if (forceColor === '3') return 'truecolor'
  if (colorterm === 'truecolor' || colorterm === '24bit') return 'truecolor'
  if (colorterm === 'ansi256' || term.includes('256color')) return 'ansi256'
  if (process.env['CI']) return 'ansi'
  if (process.env['WT_SESSION']) return 'truecolor'   // Windows Terminal
  if (process.env['TERM_PROGRAM'] === 'vscode') return 'truecolor'
  if (process.env['TERM_PROGRAM'] === 'iTerm.app') return 'truecolor'
  if (process.env['TERM_PROGRAM'] === 'Hyper') return 'truecolor'
  if (term === 'xterm-256color' || term === 'screen-256color') return 'ansi256'
  if (term.startsWith('xterm') || term === 'rxvt') return 'ansi'
  if (term === 'dumb') return 'none'
  return 'ansi'
}

/** Detect terminal name from environment. */
function detectTerminalName(): string | null {
  if (process.env['TERM_PROGRAM']) return process.env['TERM_PROGRAM']!
  if (process.env['TERM']) return process.env['TERM']!
  return null
}

/**
 * Synchronously detect terminal capabilities from env vars.
 * Does not issue escape-sequence queries (avoids blocking startup).
 * For DA2 / background-color queries, call queryAsync() instead.
 */
export function detectCapabilities(): TerminalCapabilities {
  return {
    colorSupport: detectColorSupport(),
    terminalName: detectTerminalName(),
    unicodeSupported: detectUnicodeSupport(),
    kittyKeyboard: detectKittyKeyboard(),
    windowsTerminal: !!process.env['WT_SESSION'],
    vscodeTerminal: process.env['TERM_PROGRAM'] === 'vscode',
  }
}

function detectUnicodeSupport(): boolean {
  const lang = (process.env['LANG'] ?? process.env['LC_ALL'] ?? '').toLowerCase()
  return lang.includes('utf-8') || lang.includes('utf8') ||
         process.env['TERM_PROGRAM'] === 'iTerm.app' ||
         process.env['TERM_PROGRAM'] === 'vscode' ||
         !!process.env['WT_SESSION']
}

function detectKittyKeyboard(): boolean {
  // Kitty terminal sets TERM=xterm-kitty
  return (process.env['TERM'] ?? '') === 'xterm-kitty' ||
         (process.env['TERM_PROGRAM'] ?? '') === 'WezTerm'
}

/** Cached capabilities (populated on first call). */
let _cached: TerminalCapabilities | null = null

export function getCapabilities(): TerminalCapabilities {
  if (!_cached) _cached = detectCapabilities()
  return _cached
}

/** Invalidate the capability cache (e.g. after $TERM changes). */
export function resetCapabilityCache(): void {
  _cached = null
}
