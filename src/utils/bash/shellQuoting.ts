/**
 * Shell command quoting utilities — adapted from CC's utils/bash/shellQuoting.ts
 *
 * Handles heredoc detection, multiline string detection, and safe shell quoting
 * for commands passed to `eval`. Also detects existing stdin redirects.
 */

import { quote } from './shellQuote.js'

function containsHeredoc(command: string): boolean {
  // Exclude bit-shift operators and arithmetic contexts
  if (/\d\s*<<\s*\d/.test(command) || /\[\[\s*\d+\s*<<\s*\d+\s*\]\]/.test(command) || /\$\(\(.*<<.*\)\)/.test(command)) {
    return false
  }
  return /<<-?\s*(?:(['"]?)(\w+)\1|\\(\w+))/.test(command)
}

function containsMultilineString(command: string): boolean {
  const singleQuoteMultiline = /'(?:[^'\\]|\\.)*\n(?:[^'\\]|\\.)*'/
  const doubleQuoteMultiline = /"(?:[^"\\]|\\.)*\n(?:[^"\\]|\\.)*"/
  return singleQuoteMultiline.test(command) || doubleQuoteMultiline.test(command)
}

export function quoteShellCommand(command: string, addStdinRedirect = true): string {
  if (containsHeredoc(command) || containsMultilineString(command)) {
    const escaped = command.replace(/'/g, "'\"'\"'")
    const quoted = `'${escaped}'`
    if (containsHeredoc(command)) return quoted
    return addStdinRedirect ? `${quoted} < /dev/null` : quoted
  }

  if (addStdinRedirect) return quote([command, '<', '/dev/null'])
  return quote([command])
}

export function hasStdinRedirect(command: string): boolean {
  return /(?:^|[\s;&|])<(?![<(])\s*\S+/.test(command)
}

export function shouldAddStdinRedirect(command: string): boolean {
  if (containsHeredoc(command)) return false
  if (hasStdinRedirect(command)) return false
  return true
}

/**
 * Rewrite Windows CMD-style `>nul` to `/dev/null` for POSIX shells.
 * The model occasionally uses CMD syntax even on Git Bash / WSL.
 */
export function rewriteWindowsNullRedirects(command: string): string {
  return command
    .replace(/\bnul\b/g, '/dev/null')
    .replace(/>\s*NUL\b/g, '> /dev/null')
}
