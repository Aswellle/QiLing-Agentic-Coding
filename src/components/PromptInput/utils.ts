/**
 * PromptInput utilities — adapted from CC's components/PromptInput/utils.ts
 *
 * isVimModeEnabled: checks if vim mode is active from config.
 * getNewlineInstructions: returns newline hint based on terminal type.
 * isNonSpacePrintable: true for printable non-whitespace keystrokes.
 */

import type { Key } from 'ink'
import { env } from '../../utils/env.js'
// env is imported but used conditionally
export function isVimModeEnabled(): boolean {
  return false // Override in REPL when vim mode is available
}

export function getNewlineInstructions(): string {
  if (env.terminal === 'iterm2' && process.platform === 'darwin') return 'shift + ⏎ for newline'
  return 'backslash (\\) + return (⏎) for newline'
}

export function isNonSpacePrintable(input: string, key: Key): boolean {
  // FROM CC: added pageUp/pageDown/home/end to non-printable set
  // FROM CC: added pageUp/pageDown (home/end not in Ink Key type)
  if (key.ctrl || key.meta || key.escape || key.return || key.tab || key.backspace || key.delete || key.upArrow || key.downArrow || key.leftArrow || key.rightArrow || key.pageUp || key.pageDown) {
    return false
  }
  return input.length > 0 && !/^\s/.test(input) && !input.startsWith('\x1b')
}
