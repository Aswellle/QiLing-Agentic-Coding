/**
 * Shell permission rule matching — ported from CC's utils/permissions/shellRuleMatching.ts
 *
 * Supports three rule types for Bash/PowerShell commands:
 *   exact   — "npm install"           matches only "npm install"
 *   prefix  — "npm:*"                 matches "npm install", "npm run build", etc.
 *   wildcard — "git commit -m *"      matches "git commit -m 'any message'"
 *
 * Used by PermissionsManager to match stored permission rules against tool inputs.
 */

import type { PermissionUpdate } from './PermissionUpdate'

// ─── Wildcard escaping placeholders ──────────────────────────────────────────
// Null-byte sentinels compiled once at module level (not per-check).
const ESCAPED_STAR_PLACEHOLDER = '\x00ESCAPED_STAR\x00'
const ESCAPED_BACKSLASH_PLACEHOLDER = '\x00ESCAPED_BACKSLASH\x00'
const ESCAPED_STAR_PLACEHOLDER_RE = new RegExp(ESCAPED_STAR_PLACEHOLDER, 'g')
const ESCAPED_BACKSLASH_PLACEHOLDER_RE = new RegExp(ESCAPED_BACKSLASH_PLACEHOLDER, 'g')

// ─── Types ────────────────────────────────────────────────────────────────────

/** Parsed permission rule discriminated union */
export type ShellPermissionRule =
  | { type: 'exact'; command: string }
  | { type: 'prefix'; prefix: string }
  | { type: 'wildcard'; pattern: string }

// ─── Rule parsing ─────────────────────────────────────────────────────────────

/**
 * Extract prefix from legacy :* syntax (e.g., "npm:*" → "npm").
 * Maintained for backwards compatibility.
 */
export function permissionRuleExtractPrefix(permissionRule: string): string | null {
  const match = permissionRule.match(/^(.+):\*$/)
  return match?.[1] ?? null
}

/**
 * Check if a pattern contains unescaped wildcards (not legacy :* syntax).
 */
export function hasWildcards(pattern: string): boolean {
  if (pattern.endsWith(':*')) return false
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '*') {
      let backslashCount = 0
      let j = i - 1
      while (j >= 0 && pattern[j] === '\\') { backslashCount++; j-- }
      if (backslashCount % 2 === 0) return true
    }
  }
  return false
}

/**
 * Parse a permission rule string into a structured rule object.
 */
export function parsePermissionRule(permissionRule: string): ShellPermissionRule {
  const prefix = permissionRuleExtractPrefix(permissionRule)
  if (prefix !== null) return { type: 'prefix', prefix }
  if (hasWildcards(permissionRule)) return { type: 'wildcard', pattern: permissionRule }
  return { type: 'exact', command: permissionRule }
}

// ─── Wildcard matching ────────────────────────────────────────────────────────

/**
 * Match a command against a wildcard pattern.
 *
 * Rules:
 *   *   matches any sequence of characters (including spaces)
 *   \*  matches a literal asterisk
 *   \\  matches a literal backslash
 *
 * Special: trailing " *" (space + wildcard, single wildcard) makes the
 * trailing " args" optional — so "git *" matches both "git add" and "git".
 */
export function matchWildcardPattern(
  pattern: string,
  command: string,
  caseInsensitive = false,
): boolean {
  const trimmedPattern = pattern.trim()

  // Process escape sequences: \* → placeholder, \\ → placeholder
  let processed = ''
  let i = 0
  while (i < trimmedPattern.length) {
    const char = trimmedPattern[i]
    if (char === '\\' && i + 1 < trimmedPattern.length) {
      const next = trimmedPattern[i + 1]
      if (next === '*') { processed += ESCAPED_STAR_PLACEHOLDER; i += 2; continue }
      if (next === '\\') { processed += ESCAPED_BACKSLASH_PLACEHOLDER; i += 2; continue }
    }
    processed += char
    i++
  }

  // Escape regex special chars except *, then replace * with .*
  const escaped = processed.replace(/[.+?^${}()|[\]\\'"]/g, '\\$&')
  const withWildcards = escaped.replace(/\*/g, '.*')

  // Restore placeholders as escaped regex literals
  let regexPattern = withWildcards
    .replace(ESCAPED_STAR_PLACEHOLDER_RE, '\\*')
    .replace(ESCAPED_BACKSLASH_PLACEHOLDER_RE, '\\\\')

  // Make trailing " .*" optional when it's the only wildcard
  // ("git *" should match bare "git")
  const unescapedStarCount = (processed.match(/\*/g) ?? []).length
  if (regexPattern.endsWith(' .*') && unescapedStarCount === 1) {
    regexPattern = regexPattern.slice(0, -3) + '( .*)?'
  }

  const flags = 's' + (caseInsensitive ? 'i' : '')
  return new RegExp(`^${regexPattern}$`, flags).test(command)
}

// ─── Command matching ─────────────────────────────────────────────────────────

/**
 * Check if a command matches a parsed shell permission rule.
 */
export function matchCommandToRule(
  rule: ShellPermissionRule,
  command: string,
  caseInsensitive = false,
): boolean {
  switch (rule.type) {
    case 'exact':
      return caseInsensitive
        ? rule.command.toLowerCase() === command.toLowerCase()
        : rule.command === command
    case 'prefix':
      return command === rule.prefix ||
        command.startsWith(rule.prefix + ' ') ||
        command.startsWith(rule.prefix + '\t')
    case 'wildcard':
      return matchWildcardPattern(rule.pattern, command, caseInsensitive)
  }
}

/**
 * Find the first matching rule from a list of rule strings.
 * Returns { matched: true, rule } if found, { matched: false } otherwise.
 */
export function findMatchingRule(
  ruleStrings: string[],
  command: string,
  caseInsensitive = false,
): { matched: true; ruleString: string; rule: ShellPermissionRule } | { matched: false } {
  for (const ruleString of ruleStrings) {
    const rule = parsePermissionRule(ruleString)
    if (matchCommandToRule(rule, command, caseInsensitive)) {
      return { matched: true, ruleString, rule }
    }
  }
  return { matched: false }
}

// ─── Permission update suggestions ───────────────────────────────────────────

/** Suggest allowing this exact command */
export function suggestionForExactCommand(
  toolName: string,
  command: string,
): PermissionUpdate[] {
  return [{
    type: 'addRules',
    rules: [{ toolName, ruleContent: command }],
    behavior: 'allow',
    destination: 'localSettings',
  }]
}

/** Suggest allowing this command prefix (e.g. "npm:*") */
export function suggestionForPrefix(
  toolName: string,
  prefix: string,
): PermissionUpdate[] {
  return [{
    type: 'addRules',
    rules: [{ toolName, ruleContent: `${prefix}:*` }],
    behavior: 'allow',
    destination: 'localSettings',
  }]
}
