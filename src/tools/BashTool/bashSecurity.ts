/**
 * BashTool security checks — ported from CC's BashTool/bashSecurity.ts
 *
 * Implements text/regex-based security validation for bash commands.
 * CC uses tree-sitter for full AST analysis; QiLing falls back to
 * regex pattern matching covering the same security properties.
 */

import { extractHeredocs } from '../../utils/bash/heredoc'
import { tryParseShellCommand, hasMalformedTokens } from '../../utils/bash/shellQuote'

// ─── Command substitution patterns (from CC's COMMAND_SUBSTITUTION_PATTERNS) ──

const COMMAND_SUBSTITUTION_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /<\(/, message: 'process substitution <()' },
  { pattern: />\(/, message: 'process substitution >()' },
  { pattern: /=\(/, message: 'Zsh process substitution =()' },
  { pattern: /(?:^|[\s;&|])=[a-zA-Z_]/, message: 'Zsh equals expansion (=cmd)' },
  { pattern: /\$\(/, message: '$() command substitution' },
  { pattern: /\$\{/, message: '${} parameter substitution' },
  { pattern: /\$\[/, message: '$[] legacy arithmetic expansion' },
  { pattern: /~\[/, message: 'Zsh-style parameter expansion' },
  { pattern: /\(e:/, message: 'Zsh-style glob qualifiers' },
  { pattern: /\(\+/, message: 'Zsh glob qualifier with command execution' },
  { pattern: /\}\s*always\s*\{/, message: 'Zsh always block (try/always construct)' },
  { pattern: /<#/, message: 'PowerShell comment syntax' },
]

// ─── Zsh dangerous commands (zmodload and derived builtins) ───────────────────

const ZSH_DANGEROUS_COMMANDS = new Set([
  'zmodload', 'emulate',
  'sysopen', 'sysread', 'syswrite', 'sysseek',
  'zpty', 'ztcp', 'zsocket', 'mapfile',
  'zf_rm', 'zf_mv', 'zf_ln', 'zf_chmod',
  'zf_chown', 'zf_mkdir', 'zf_rmdir', 'zf_chgrp',
])

// ─── Variable assignments that can hijack command execution ───────────────────

const DANGEROUS_VARIABLE_RE =
  /(?:^|[;&|])\s*(?:export\s+)?(?:IFS|LD_PRELOAD|LD_LIBRARY_PATH|BASH_ENV|ENV|PROMPT_COMMAND|CDPATH|FPATH|PERL5LIB|PYTHONPATH|RUBYLIB|NODE_PATH)\s*=/

const HEREDOC_IN_SUBSTITUTION = /\$\(.*<</

// ─── Security result type ─────────────────────────────────────────────────────

export type BashSecurityResult = {
  behavior: 'allow' | 'ask' | 'deny'
  message?: string
}

// ─── Individual validators ────────────────────────────────────────────────────

function checkControlChars(command: string): string | null {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional security check
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(command)) {
    return 'control characters in command (binary injection)'
  }
  return null
}

function checkHeredocInSubstitution(command: string): string | null {
  return HEREDOC_IN_SUBSTITUTION.test(command) ? 'heredoc inside command substitution' : null
}

function checkJqSystem(command: string): string | null {
  if (/\bjq\b/.test(command) && /\bsystem\s*\(/.test(command)) {
    return 'jq system() executes OS commands'
  }
  return null
}

function checkObfuscatedFlags(command: string): string | null {
  if (/--[^-\s]*(?:\$['"]|\\x[0-9a-fA-F]{2}|\\[0-7]{3})/.test(command)) {
    return 'obfuscated command flags'
  }
  return null
}

function checkCommandSubstitution(command: string): string | null {
  for (const { pattern, message } of COMMAND_SUBSTITUTION_PATTERNS) {
    if (pattern.test(command)) return message
  }
  return null
}

function checkDangerousVariables(command: string): string | null {
  return DANGEROUS_VARIABLE_RE.test(command)
    ? 'dangerous variable assignment (IFS, LD_PRELOAD, etc.)'
    : null
}

function checkBackticks(command: string): string | null {
  const stripped = command.replace(/\'[^']*\'/g, "''").replace(/"[^"]*"/g, '""')
  const count = (stripped.match(/`/g) ?? []).length
  return count >= 2 ? 'backtick command substitution' : null
}

function checkProcEnviron(command: string): string | null {
  return /\/proc\/[0-9]+\/environ\b/.test(command)
    ? '/proc/*/environ access (process environment exfiltration)'
    : null
}

function checkMalformedTokens(command: string): string | null {
  const parsed = tryParseShellCommand(command)
  if (!parsed.success) return null
  return hasMalformedTokens(command, parsed.tokens) ? 'malformed shell tokens (potential injection)' : null
}

function checkBraceExpansion(command: string): string | null {
  return /\{[^}]*(?:bash|sh|python|perl|ruby|curl|wget|eval)[^}]*\}/.test(command)
    ? 'brace expansion with dangerous commands'
    : null
}

// Unicode whitespace characters that look like spaces but are not (U+00A0, U+2000-U+200A, U+2028, U+2029, U+3000)
// Using RegExp constructor to avoid TypeScript parser issues with embedded Unicode codepoints.
const UNICODE_WHITESPACE_RE = new RegExp(
    '[  -   　]'
)

function checkUnicodeWhitespace(command: string): string | null {
  return UNICODE_WHITESPACE_RE.test(command) ? 'Unicode whitespace (potential visual spoofing)' : null
}

function checkZshDangerousCommands(command: string): string | null {
  const result = tryParseShellCommand(command)
  const words = result.success
    ? result.tokens
        .filter((t): t is string => typeof t === 'string')
        .map(t => t.split(/\s/)[0]?.toLowerCase() ?? '')
    : command.split(/[\s;&|()]+/).filter(Boolean).map(w => w.toLowerCase())

  for (const w of words) {
    if (ZSH_DANGEROUS_COMMANDS.has(w)) return `dangerous Zsh command: ${w}`
  }
  return null
}

function checkGitCommitSubstitution(command: string): string | null {
  return /\bgit\s+commit\b[^;&|]*-[mF]\s*["'][^"']*\$\(/.test(command)
    ? 'command substitution in git commit message'
    : null
}

function checkNewlineInjection(command: string): string | null {
  return /\n\s*(?:rm|sudo|curl|wget|sh|bash|python|perl|ruby)\b/.test(command)
    ? 'newline injection pattern'
    : null
}

// ─── Main validator ───────────────────────────────────────────────────────────

/**
 * Run all security checks against a bash command.
 *
 * Returns:
 *   { behavior: 'allow' } — safe to execute
 *   { behavior: 'ask', message } — suspicious, requires user approval
 *   { behavior: 'deny', message } — blocked (high-confidence injection)
 */
export function bashCommandIsSafe(command: string): BashSecurityResult {
  const { processedCommand: strippedCommand } = extractHeredocs(command)

  // Denial-level (highest confidence injections)
  const denialChecks: Array<(cmd: string) => string | null> = [
    checkControlChars,
    checkMalformedTokens,
  ]
  for (const check of denialChecks) {
    const issue = check(strippedCommand)
    if (issue) return { behavior: 'deny', message: issue }
  }

  // Ask-level (suspicious, need user approval)
  const askChecks: Array<(cmd: string) => string | null> = [
    checkHeredocInSubstitution,
    checkGitCommitSubstitution,
    checkJqSystem,
    checkObfuscatedFlags,
    checkProcEnviron,
    checkDangerousVariables,
    checkZshDangerousCommands,
    checkBraceExpansion,
    checkBackticks,
    checkUnicodeWhitespace,
    checkNewlineInjection,
    checkCommandSubstitution,
  ]

  for (const check of askChecks) {
    const issue = check(strippedCommand)
    if (issue) return { behavior: 'ask', message: issue }
  }

  return { behavior: 'allow' }
}

/**
 * Exported for backwards compatibility with bashPermissions.ts.
 * Strips heredocs from a command before security analysis.
 */
export function stripSafeHeredocSubstitutions(command: string): string {
  return extractHeredocs(command).processedCommand
}
