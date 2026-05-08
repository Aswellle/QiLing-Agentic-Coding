/**
 * OSC 8 terminal hyperlink support — ported from CC's utils/hyperlink.ts
 *
 * Creates clickable hyperlinks in terminals that support OSC 8.
 * Falls back to plain URL text when not supported.
 */

// OSC 8 hyperlink escape sequences (BEL terminator for broader compat)
export const OSC8_START = '\x1b]8;;'
export const OSC8_END = '\x07'

function terminalSupportsHyperlinks(): boolean {
  // Check for known hyperlink-supporting terminals
  const term = process.env.TERM ?? ''
  const termProgram = process.env.TERM_PROGRAM ?? ''
  const colorTerm = process.env.COLORTERM ?? ''
  // VSCode terminal, iTerm2, Hyper, WezTerm support OSC 8
  return (
    termProgram === 'iTerm.app' ||
    termProgram === 'vscode' ||
    termProgram === 'WezTerm' ||
    colorTerm === 'truecolor' ||
    term.includes('256color') ||
    !!process.env.VTE_VERSION  // GNOME Terminal
  )
}

/**
 * Create a clickable OSC 8 hyperlink.
 * Falls back to plain URL if terminal doesn't support hyperlinks.
 */
export function createHyperlink(
  url: string,
  content?: string,
  options?: { supportsHyperlinks?: boolean }
): string {
  const hasSupport = options?.supportsHyperlinks ?? terminalSupportsHyperlinks()
  if (!hasSupport) return url
  const displayText = content ?? url
  return `${OSC8_START}${url}${OSC8_END}${displayText}${OSC8_START}${OSC8_END}`
}
