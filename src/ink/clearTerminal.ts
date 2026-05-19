/**
 * Cross-platform terminal clearing — adapted from CC's ink/clearTerminal.ts
 *
 * Detects modern terminals that support ESC[3J for clearing scrollback.
 * Windows Terminal, VS Code, and mintty support modern sequences.
 * Legacy cmd.exe and old ConHost fall back to legacy clear.
 */

import { CURSOR_HOME, csi, ERASE_SCREEN, ERASE_SCROLLBACK } from './termio/csi.js'

const CURSOR_HOME_WINDOWS = csi(0, 'f')

function isModernWindowsTerminal(): boolean {
  if (process.platform !== 'win32') return false
  if (process.env.WT_SESSION) return true
  if (process.env.TERM_PROGRAM === 'vscode' && process.env.TERM_PROGRAM_VERSION) return true
  if (process.env.TERM_PROGRAM === 'mintty' || process.env.MSYSTEM) return true
  return false
}

export function getClearTerminalSequence(): string {
  if (process.platform === 'win32') {
    return isModernWindowsTerminal()
      ? ERASE_SCREEN + ERASE_SCROLLBACK + CURSOR_HOME
      : ERASE_SCREEN + CURSOR_HOME_WINDOWS
  }
  return ERASE_SCREEN + ERASE_SCROLLBACK + CURSOR_HOME
}

export const clearTerminal = getClearTerminalSequence()
