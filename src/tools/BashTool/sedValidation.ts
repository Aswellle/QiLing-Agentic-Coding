/**
 * sed command validation — ported from CC's BashTool/sedValidation.ts
 *
 * Validates sed commands to block dangerous operations:
 *   - w/W: write to files
 *   - e/E: execute shell commands
 *   - s/.../flags with w or e flags
 *
 * Safe operations (line print, substitution without dangerous flags) are allowed.
 */

import { tryParseShellCommand } from '../../utils/bash/shellQuote'

function validateFlagsAgainstAllowlist(flags: string[], allowedFlags: string[]): boolean {
  for (const flag of flags) {
    if (flag.startsWith('-') && !flag.startsWith('--') && flag.length > 2) {
      for (let i = 1; i < flag.length; i++) {
        if (!allowedFlags.includes('-' + flag[i])) return false
      }
    } else {
      if (!allowedFlags.includes(flag)) return false
    }
  }
  return true
}

export function isLinePrintingCommand(command: string, expressions: string[]): boolean {
  const sedMatch = command.match(/^\s*sed\s+/)
  if (!sedMatch) return false
  const withoutSed = command.slice(sedMatch[0].length)
  const parseResult = tryParseShellCommand(withoutSed)
  if (!parseResult.success) return false

  const flags: string[] = []
  for (const arg of parseResult.tokens) {
    if (typeof arg === 'string' && arg.startsWith('-') && arg !== '--') flags.push(arg)
  }

  const allowedFlags = ['-n', '--quiet', '--silent', '-E', '--regexp-extended', '-r', '-z', '--zero-terminated', '--posix']
  if (!validateFlagsAgainstAllowlist(flags, allowedFlags)) return false

  if (!flags.includes('-n') && !flags.includes('--quiet') && !flags.includes('--silent')) return false

  const printPattern = /^\s*(?:\d+(?:,\d+)?|\$)?\s*p\s*$/
  const printOrQuitPattern = /^\s*(?:\d+(?:,\d+)?|\$)?\s*[pqQ]\s*$/
  const semicolonSeparated = /^[0-9$,p;\s]+$/

  for (const expr of expressions) {
    if (!printPattern.test(expr) && !printOrQuitPattern.test(expr) && !semicolonSeparated.test(expr)) return false
  }
  return true
}

function hasDangerousOperation(cmd: string): boolean {
  // w/W (file write) checks
  if (/^[wW]\s*\S+/.test(cmd) || /^\d+\s*[wW]\s*\S+/.test(cmd) ||
      /^\$\s*[wW]\s*\S+/.test(cmd) || /^\/[^/]*\/[IMim]*\s*[wW]\s*\S+/.test(cmd) ||
      /^\d+,\d+\s*[wW]\s*\S+/.test(cmd) || /^\d+,\$\s*[wW]\s*\S+/.test(cmd)) {
    return true
  }

  // e/E (execute) checks
  if (/^e/.test(cmd) || /^\d+\s*e/.test(cmd) || /^\$\s*e/.test(cmd) ||
      /^\/[^/]*\/[IMim]*\s*e/.test(cmd) || /^\d+,\d+\s*e/.test(cmd) || /^\d+,\$\s*e/.test(cmd)) {
    return true
  }

  // s command with dangerous flags
  const subMatch = cmd.match(/s([^\\\n]).*?\1.*?\1(.*?)$/)
  if (subMatch) {
    const flags = subMatch[2] ?? ''
    if (flags.includes('w') || flags.includes('W') || flags.includes('e') || flags.includes('E')) return true
  }

  // y command with suspicious chars
  const yMatch = cmd.match(/y([^\\\n])/)
  if (yMatch && /[wWeE]/.test(cmd)) return true

  return false
}

export function sedCommandIsAllowedByAllowlist(
  command: string,
  options: { allowFileWrites?: boolean } = {},
): boolean {
  const sedMatch = command.match(/^\s*sed\s+/)
  if (!sedMatch) return true

  const withoutSed = command.slice(sedMatch[0].length)
  const parseResult = tryParseShellCommand(withoutSed)
  if (!parseResult.success) return false

  const expressions: string[] = []
  const tokens = parseResult.tokens

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (typeof token === 'string' && (token === '-e' || token === '--expression')) {
      const next = tokens[i + 1]
      if (typeof next === 'string') { expressions.push(next); i++ }
    } else if (typeof token === 'string' && token.startsWith('-e') && token.length > 2) {
      expressions.push(token.slice(2))
    }
  }

  if (expressions.length === 0) {
    // First non-flag arg is the expression
    for (const token of tokens) {
      if (typeof token === 'string' && !token.startsWith('-')) {
        expressions.push(token)
        break
      }
    }
  }

  for (const expr of expressions) {
    const parts = expr.split(';').map(p => p.trim())
    for (const part of parts) {
      if (part && hasDangerousOperation(part)) return false
    }
  }

  return true
}

/**
 * Main entry point: check if a command containing sed is safe.
 * Returns the sed-specific security result.
 */
export function checkSedSecurity(command: string): { allowed: boolean; reason?: string } {
  // Only care about commands that contain sed
  if (!/\bsed\b/.test(command)) return { allowed: true }

  const commands = command.split(/[;&|]/).filter(c => c.trim().startsWith('sed') || c.trim().startsWith(' sed'))
  for (const cmd of commands) {
    const trimmed = cmd.trim()
    if (!trimmed.startsWith('sed')) continue
    if (!sedCommandIsAllowedByAllowlist(trimmed)) {
      return { allowed: false, reason: 'sed command contains dangerous operations (w/e/W/E)' }
    }
  }
  return { allowed: true }
}
