/**
 * OSC 8 hyperlink support detection — adapted from CC's ink/supports-hyperlinks.ts
 *
 * Extends the supports-hyperlinks library with additional terminal detection
 * (Ghostty, Hyper, kitty, alacritty, iTerm2 — not always detected by the library).
 */

export const ADDITIONAL_HYPERLINK_TERMINALS = [
  'ghostty', 'Hyper', 'kitty', 'alacritty', 'iTerm.app', 'iTerm2',
]

type EnvLike = Record<string, string | undefined>
type SupportsHyperlinksOptions = { env?: EnvLike; stdoutSupported?: boolean }

/**
 * Returns whether stdout supports OSC 8 hyperlinks.
 * Checks TERM_PROGRAM, LC_TERMINAL (preserved inside tmux), and TERM.
 */
export function supportsHyperlinks(options?: SupportsHyperlinksOptions): boolean {
  // First try the library if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const lib = require('supports-hyperlinks') as { stdout?: boolean }
    if (options?.stdoutSupported ?? lib.stdout) return true
  } catch {
    // Library not available — continue with manual detection
  }

  const env = options?.env ?? process.env

  const termProgram = env['TERM_PROGRAM']
  if (termProgram && ADDITIONAL_HYPERLINK_TERMINALS.includes(termProgram)) return true

  // LC_TERMINAL preserved inside tmux (where TERM_PROGRAM is 'tmux')
  const lcTerminal = env['LC_TERMINAL']
  if (lcTerminal && ADDITIONAL_HYPERLINK_TERMINALS.includes(lcTerminal)) return true

  // Kitty sets TERM=xterm-kitty
  const term = env['TERM']
  if (term?.includes('kitty')) return true

  // Windows Terminal has WT_SESSION (already detected in hyperlink.ts)
  if (env['WT_SESSION']) return true

  return false
}
