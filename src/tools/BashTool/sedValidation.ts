/**
 * sed command validation — adapted from CC's BashTool/sedValidation.ts
 *
 * Validates sed commands using allowlist-first + denylist double-check:
 *   Pattern 1: line-printing commands (sed -n '..p..')
 *   Pattern 2: substitution commands (sed 's/pat/rep/flags')
 *   Denylist: w/W write, e/E execute, dangerous flag combos, etc.
 *
 * QiLing adapter: checkSedSecurity() wraps sedCommandIsAllowedByAllowlist()
 * and returns { allowed, reason } for BashTool.ts callers.
 */

import { tryParseShellCommand } from '../../utils/bash/shellQuote'

// FROM CC: validateFlagsAgainstAllowlist — handles combined flags like -nE
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

/**
 * Check if a single sed expression is a valid print command.
 * STRICT ALLOWLIST — only p, Np, N,Mp forms.
 */
// FROM CC: isPrintCommand
export function isPrintCommand(cmd: string): boolean {
  if (!cmd) return false
  return /^(?:\d+|\d+,\d+)?p$/.test(cmd)
}

/**
 * Pattern 1: line-printing with -n flag.
 * Allows semicolon-separated print commands like: sed -n '1p;2p'
 */
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

  // Must have -n flag (required for Pattern 1)
  // FROM CC: also checks combined flags like -nE
  let hasNFlag = false
  for (const flag of flags) {
    if (flag === '-n' || flag === '--quiet' || flag === '--silent') { hasNFlag = true; break }
    if (flag.startsWith('-') && !flag.startsWith('--') && flag.includes('n')) { hasNFlag = true; break }
  }
  if (!hasNFlag) return false

  if (expressions.length === 0) return false

  // All expressions must be print commands (semicolon-separated allowed)
  for (const expr of expressions) {
    const cmds = expr.split(';')
    for (const cmd of cmds) {
      if (!isPrintCommand(cmd.trim())) return false
    }
  }
  return true
}

/**
 * Pattern 2: substitution commands.
 * Only allows s/pat/rep/flags where flags ∈ {g,p,i,I,m,M,1-9}.
 * When allowFileWrites=true, also permits -i/--in-place flag.
 */
// FROM CC: isSubstitutionCommand
function isSubstitutionCommand(
  command: string,
  expressions: string[],
  hasFileArguments: boolean,
  options?: { allowFileWrites?: boolean },
): boolean {
  const allowFileWrites = options?.allowFileWrites ?? false
  if (!allowFileWrites && hasFileArguments) return false

  const sedMatch = command.match(/^\s*sed\s+/)
  if (!sedMatch) return false
  const withoutSed = command.slice(sedMatch[0].length)
  const parseResult = tryParseShellCommand(withoutSed)
  if (!parseResult.success) return false

  const flags: string[] = []
  for (const arg of parseResult.tokens) {
    if (typeof arg === 'string' && arg.startsWith('-') && arg !== '--') flags.push(arg)
  }

  const allowedFlags = ['-E', '--regexp-extended', '-r', '--posix']
  if (allowFileWrites) allowedFlags.push('-i', '--in-place')
  if (!validateFlagsAgainstAllowlist(flags, allowedFlags)) return false

  if (expressions.length !== 1) return false

  const expr = expressions[0]!.trim()
  if (!expr.startsWith('s')) return false

  const substitutionMatch = expr.match(/^s\/(.*?)$/)
  if (!substitutionMatch) return false
  const rest = substitutionMatch[1]!

  let delimiterCount = 0
  let lastDelimiterPos = -1
  let i = 0
  while (i < rest.length) {
    if (rest[i] === '\\') { i += 2; continue }
    if (rest[i] === '/') { delimiterCount++; lastDelimiterPos = i }
    i++
  }
  if (delimiterCount !== 2) return false

  const exprFlags = rest.slice(lastDelimiterPos + 1)
  if (!/^[gpimIM]*[1-9]?[gpimIM]*$/.test(exprFlags)) return false

  return true
}

/**
 * Check if a sed command has file arguments (not just stdin).
 */
// FROM CC: hasFileArgs
export function hasFileArgs(command: string): boolean {
  const sedMatch = command.match(/^\s*sed\s+/)
  if (!sedMatch) return false
  const withoutSed = command.slice(sedMatch[0].length)
  const parseResult = tryParseShellCommand(withoutSed)
  if (!parseResult.success) return true
  const parsed = parseResult.tokens

  try {
    let argCount = 0
    let hasEFlag = false
    for (let i = 0; i < parsed.length; i++) {
      const arg = parsed[i]
      if (typeof arg === 'object' && arg !== null && 'op' in arg && (arg as { op: string }).op === 'glob') return true
      if (typeof arg !== 'string') continue
      if ((arg === '-e' || arg === '--expression') && i + 1 < parsed.length) { hasEFlag = true; i++; continue }
      if (arg.startsWith('--expression=')) { hasEFlag = true; continue }
      if (arg.startsWith('-e=')) { hasEFlag = true; continue }
      if (arg.startsWith('-')) continue
      argCount++
      if (hasEFlag) return true
      if (argCount > 1) return true
    }
    return false
  } catch { return true }
}

/**
 * Extract sed expressions from command, ignoring flags and filenames.
 */
// FROM CC: extractSedExpressions
export function extractSedExpressions(command: string): string[] {
  const expressions: string[] = []
  const sedMatch = command.match(/^\s*sed\s+/)
  if (!sedMatch) return expressions
  const withoutSed = command.slice(sedMatch[0].length)

  // Reject dangerous flag combinations
  if (/-e[wWe]/.test(withoutSed) || /-w[eE]/.test(withoutSed)) {
    throw new Error('Dangerous flag combination detected')
  }

  const parseResult = tryParseShellCommand(withoutSed)
  if (!parseResult.success) throw new Error(`Malformed shell syntax: ${parseResult.error}`)
  const parsed = parseResult.tokens

  try {
    let foundEFlag = false
    let foundExpression = false
    for (let i = 0; i < parsed.length; i++) {
      const arg = parsed[i]
      if (typeof arg !== 'string') continue
      if ((arg === '-e' || arg === '--expression') && i + 1 < parsed.length) {
        foundEFlag = true
        const next = parsed[i + 1]
        if (typeof next === 'string') { expressions.push(next); i++ }
        continue
      }
      if (arg.startsWith('--expression=')) { foundEFlag = true; expressions.push(arg.slice('--expression='.length)); continue }
      if (arg.startsWith('-e=')) { foundEFlag = true; expressions.push(arg.slice('-e='.length)); continue }
      if (arg.startsWith('-')) continue
      if (!foundEFlag && !foundExpression) { expressions.push(arg); foundExpression = true; continue }
      break
    }
  } catch (error) {
    throw new Error(`Failed to parse sed command: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  return expressions
}

/**
 * Denylist check: detects dangerous sed operations in a single expression.
 * Defense-in-depth even when allowlist matches.
 */
// FROM CC: containsDangerousOperations
function containsDangerousOperations(expression: string): boolean {
  const cmd = expression.trim()
  if (!cmd) return false

  // Reject non-ASCII (Unicode homoglyphs, combining chars, etc.)
  // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional security check
  if (/[^\x01-\x7F]/.test(cmd)) return true
  if (cmd.includes('{') || cmd.includes('}')) return true
  if (cmd.includes('\n')) return true

  // Reject comments (# not immediately after s command)
  const hashIndex = cmd.indexOf('#')
  if (hashIndex !== -1 && !(hashIndex > 0 && cmd[hashIndex - 1] === 's')) return true

  // Reject negation operator
  if (/^!/.test(cmd) || /[/\d$]!/.test(cmd)) return true

  // Reject GNU step address format (digit~digit)
  if (/\d\s*~\s*\d|,\s*~\s*\d|\$\s*~\s*\d/.test(cmd)) return true

  // Reject bare comma at start
  if (/^,/.test(cmd)) return true

  // Reject GNU offset addresses (comma followed by +/-)
  if (/,\s*[+-]/.test(cmd)) return true

  // Reject backslash tricks
  if (/s\\/.test(cmd) || /\\[|#%@]/.test(cmd)) return true

  // Reject escaped slashes followed by w/W
  if (/\\\/.*[wW]/.test(cmd)) return true

  // Reject slash followed by whitespace then dangerous commands
  if (/\/[^/]*\s+[wWeE]/.test(cmd)) return true

  // Reject malformed s commands
  if (/^s\//.test(cmd) && !/^s\/[^/]*\/[^/]*\/[^/]*$/.test(cmd)) return true

  // Paranoid: s command ending with dangerous chars
  if (/^s./.test(cmd) && /[wWeE]$/.test(cmd)) {
    const properSubst = /^s([^\\\n]).*?\1.*?\1[^wWeE]*$/.test(cmd)
    if (!properSubst) return true
  }

  // Check for dangerous write commands (w/W)
  if (
    /^[wW]\s*\S+/.test(cmd) ||
    /^\d+\s*[wW]\s*\S+/.test(cmd) ||
    /^\$\s*[wW]\s*\S+/.test(cmd) ||
    /^\/[^/]*\/[IMim]*\s*[wW]\s*\S+/.test(cmd) ||
    /^\d+,\d+\s*[wW]\s*\S+/.test(cmd) ||
    /^\d+,\$\s*[wW]\s*\S+/.test(cmd) ||
    /^\/[^/]*\/[IMim]*,\/[^/]*\/[IMim]*\s*[wW]\s*\S+/.test(cmd)
  ) return true

  // Check for dangerous execute commands (e/E)
  if (
    /^e/.test(cmd) ||
    /^\d+\s*e/.test(cmd) ||
    /^\$\s*e/.test(cmd) ||
    /^\/[^/]*\/[IMim]*\s*e/.test(cmd) ||
    /^\d+,\d+\s*e/.test(cmd) ||
    /^\d+,\$\s*e/.test(cmd) ||
    /^\/[^/]*\/[IMim]*,\/[^/]*\/[IMim]*\s*e/.test(cmd)
  ) return true

  // Substitution with dangerous flags (w, W, e, E)
  const substitutionMatch = cmd.match(/s([^\\\n]).*?\1.*?\1(.*?)$/)
  if (substitutionMatch) {
    const flags = substitutionMatch[2] ?? ''
    if (flags.includes('w') || flags.includes('W') || flags.includes('e') || flags.includes('E')) return true
  }

  // y command with w/W/e/E anywhere
  const yMatch = cmd.match(/y([^\\\n])/)
  if (yMatch && /[wWeE]/.test(cmd)) return true

  return false
}

/**
 * Check if a sed command is allowed by allowlist.
 * Allowlist-first (Pattern 1 or Pattern 2), then denylist double-check.
 */
export function sedCommandIsAllowedByAllowlist(
  command: string,
  options: { allowFileWrites?: boolean } = {},
): boolean {
  const allowFileWrites = options.allowFileWrites ?? false

  let expressions: string[]
  try {
    expressions = extractSedExpressions(command)
  } catch {
    return false
  }

  const hasFileArguments = hasFileArgs(command)

  let isPattern1 = false
  let isPattern2 = false

  if (allowFileWrites) {
    isPattern2 = isSubstitutionCommand(command, expressions, hasFileArguments, { allowFileWrites: true })
  } else {
    isPattern1 = isLinePrintingCommand(command, expressions)
    isPattern2 = isSubstitutionCommand(command, expressions, hasFileArguments)
  }

  if (!isPattern1 && !isPattern2) return false

  // Pattern 2 does not allow semicolons; Pattern 1 does
  for (const expr of expressions) {
    if (isPattern2 && expr.includes(';')) return false
  }

  // Defense-in-depth denylist double-check
  for (const expr of expressions) {
    if (containsDangerousOperations(expr)) return false
  }

  return true
}

/**
 * QiLing adapter: wraps sedCommandIsAllowedByAllowlist for BashTool.ts callers.
 */
export function checkSedSecurity(command: string): { allowed: boolean; reason?: string } {
  if (!/\bsed\b/.test(command)) return { allowed: true }

  const commands = command.split(/[;&|]/).filter(c => {
    const t = c.trim()
    return t.startsWith('sed') || t.startsWith(' sed')
  })
  for (const cmd of commands) {
    const trimmed = cmd.trim()
    if (!trimmed.startsWith('sed')) continue
    if (!sedCommandIsAllowedByAllowlist(trimmed)) {
      return { allowed: false, reason: 'sed command contains dangerous operations (w/e/W/E)' }
    }
  }
  return { allowed: true }
}
