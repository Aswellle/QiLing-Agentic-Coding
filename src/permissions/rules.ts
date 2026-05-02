/**
 * Permission rule matching — aligned with CC's shellRuleMatching.ts.
 *
 * Rule format: "ToolName(pattern)" | "ToolName" | "*"
 * Pattern syntax:
 *   - Exact:    "git commit"
 *   - Wildcard: "npm *", "git *", "*.ts"  (unescaped * matches anything)
 *   - Escaped:  "literal\*star", "\\\\" (literal backslash)
 *   - Trailing ' *': "git *" also matches bare "git" (optional trailing args)
 */

import type { PermissionDecision } from '../types/tool'

// ─── Advanced wildcard matcher (from CC's matchWildcardPattern) ───────────────

/**
 * Match a wildcard pattern against a command/path string.
 * - `*` matches any sequence of characters (including spaces and newlines)
 * - `\*` is a literal asterisk
 * - `\\` is a literal backslash
 * - Trailing ` *` (single space + single star at end of pattern) makes the
 *   space-and-following args optional — so "git *" also matches bare "git"
 */
function matchWildcardPattern(pattern: string, value: string): boolean {
  // Build regex from pattern, handling escapes
  let regexStr = ''
  let i = 0

  // Check for the special trailing ' *' (optional args suffix)
  // e.g. "git *" → matches "git" OR "git <anything>"
  const hasTrailingOptionalArgs = / \*$/.test(pattern) &&
    (pattern.match(/\*/g) ?? []).length === 1  // only one wildcard total

  const effectivePattern = hasTrailingOptionalArgs
    ? pattern.slice(0, -2)  // strip the trailing ' *'
    : pattern

  while (i < effectivePattern.length) {
    const ch = effectivePattern[i]
    if (ch === '\\' && i + 1 < effectivePattern.length) {
      const next = effectivePattern[i + 1]
      if (next === '*' || next === '\\') {
        regexStr += next.replace(/[.+^${}()|[\]\\]/g, '\\$&')
        i += 2
        continue
      }
    }
    if (ch === '*') {
      regexStr += '[\\s\\S]*'  // dotAll equivalent
    } else {
      regexStr += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    }
    i++
  }

  if (hasTrailingOptionalArgs) {
    // Optional: " <anything>"
    regexStr += '( [\\s\\S]*)?'
  }

  try {
    return new RegExp(`^${regexStr}$`, 'i').test(value)
  } catch {
    // Malformed pattern — fall back to plain equality
    return pattern.toLowerCase() === value.toLowerCase()
  }
}

// ─── Rule parser ──────────────────────────────────────────────────────────────

function parseRule(rule: string): { toolName: string; argPattern: string | null } {
  const match = rule.match(/^([^(]+)(?:\((.+)\))?$/)
  if (!match) return { toolName: rule.trim(), argPattern: null }
  return {
    toolName: match[1].trim(),
    argPattern: match[2]?.trim() ?? null,
  }
}

// ─── Input serialiser (tool-specific) ────────────────────────────────────────

export function stringifyInput(toolName: string, input: unknown): string {
  if (typeof input === 'string') return input
  if (typeof input !== 'object' || input === null) return String(input)

  const obj = input as Record<string, unknown>

  // Shell tools: match against the command string
  if (toolName === 'Bash' || toolName === 'PowerShell') {
    const cmd = obj.command
    return typeof cmd === 'string' ? cmd : JSON.stringify(input)
  }

  // File tools: match against the path
  const filePath = obj.path ?? obj.file_path ?? obj.filepath ?? obj.file_paths
  if (typeof filePath === 'string') return filePath
  if (Array.isArray(filePath)) return filePath.join('\n')

  return JSON.stringify(input)
}

// ─── Rule evaluation ──────────────────────────────────────────────────────────

export function evaluateRules(
  rules: string[],
  toolName: string,
  input: unknown
): boolean {
  const inputStr = stringifyInput(toolName, input)

  for (const rule of rules) {
    const { toolName: ruleTool, argPattern } = parseRule(rule)

    // Tool name match: wildcard "*" or case-insensitive exact match or prefix match "npm:*"
    const toolMatches =
      ruleTool === '*' ||
      ruleTool.toLowerCase() === toolName.toLowerCase() ||
      matchWildcardPattern(ruleTool, toolName)

    if (!toolMatches) continue

    // No arg pattern → rule matches on tool name alone
    if (!argPattern) return true

    // Arg pattern match
    if (matchWildcardPattern(argPattern, inputStr)) return true
  }

  return false
}

export function checkRules(
  allowRules: string[],
  denyRules: string[],
  toolName: string,
  input: unknown
): PermissionDecision | null {
  // Deny rules are highest priority
  if (denyRules.length > 0 && evaluateRules(denyRules, toolName, input)) {
    return { type: 'deny', reason: `Denied by rule for ${toolName}` }
  }

  // Allow rules
  if (allowRules.length > 0 && evaluateRules(allowRules, toolName, input)) {
    return { type: 'allow' }
  }

  return null
}

// ─── Rule suggestion helpers (for /doctor output) ────────────────────────────

/** Suggest the minimal allow rule for an exact command */
export function suggestExactRule(toolName: string, command: string): string {
  return `${toolName}(${command})`
}

/** Suggest a prefix wildcard rule for a command prefix */
export function suggestPrefixRule(toolName: string, prefix: string): string {
  return `${toolName}(${prefix} *)`
}
