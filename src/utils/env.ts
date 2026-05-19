/**
 * Environment detection utilities — adapted from CC's utils/env.ts
 *
 * Provides terminal/platform detection constants used throughout the codebase.
 * Simplified for QiLing: removes CC-specific auth/billing fields.
 */

export type TerminalType =
  | 'iterm2' | 'kitty' | 'ghostty' | 'vscode' | 'wezterm'
  | 'windows-terminal' | 'hyper' | 'alacritty' | 'unknown'

function detectTerminal(): TerminalType {
  const tp = process.env.TERM_PROGRAM
  const te = process.env.TERM_EMULATOR

  if (process.env.ITERM_SESSION_ID || tp === 'iTerm.app') return 'iterm2'
  if (process.env.KITTY_WINDOW_ID) return 'kitty'
  if (tp === 'ghostty') return 'ghostty'
  if (process.env.VSCODE_INJECTION || process.env.VSCODE_PID) return 'vscode'
  if (process.env.WT_SESSION) return 'windows-terminal'
  if (process.env.WEZTERM_EXECUTABLE) return 'wezterm'
  if (te === 'hyper') return 'hyper'
  if (tp === 'alacritty') return 'alacritty'
  return 'unknown'
}

export const env = {
  terminal: detectTerminal(),
  platform: process.platform as 'win32' | 'darwin' | 'linux',
  isCI: !!(process.env.CI || process.env.CONTINUOUS_INTEGRATION),
  isTTY: process.stdout.isTTY ?? false,
  isInTmux: !!process.env.TMUX,
  isInScreen: !!process.env.STY,
}
