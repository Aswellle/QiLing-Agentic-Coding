/**
 * Shell permission rule matching — adapted from CC's utils/permissions/shellRuleMatching.ts
 *
 * Parses permission rules (exact, legacy-prefix :*, wildcard *) and matches
 * shell commands against them. Used by BashTool/PowerShellTool permission checks.
 */

import type { PermissionUpdate } from './PermissionUpdateSchema.js'

const ESCAPED_STAR_PLACEHOLDER = '\x00ESCAPED_STAR\x00'
const ESCAPED_BACKSLASH_PLACEHOLDER = '\x00ESCAPED_BACKSLASH\x00'
const ESCAPED_STAR_PLACEHOLDER_RE = new RegExp(ESCAPED_STAR_PLACEHOLDER, 'g')
const ESCAPED_BACKSLASH_PLACEHOLDER_RE = new RegExp(ESCAPED_BACKSLASH_PLACEHOLDER, 'g')

export type ShellPermissionRule =
  | { type: 'exact'; command: string }
  | { type: 'prefix'; prefix: string }
  | { type: 'wildcard'; pattern: string }

export function permissionRuleExtractPrefix(permissionRule: string): string | null {
  return permissionRule.match(/^(.+):\*$/)?.[1] ?? null
}

export function hasWildcards(pattern: string): boolean {
  if (pattern.endsWith(':*')) return false
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '*') {
      let backslashCount = 0, j = i - 1
      while (j >= 0 && pattern[j] === '\\') { backslashCount++; j-- }
      if (backslashCount % 2 === 0) return true
    }
  }
  return false
}

export function matchWildcardPattern(pattern: string, command: string, caseInsensitive = false): boolean {
  const trimmedPattern = pattern.trim()
  let processed = '', i = 0
  while (i < trimmedPattern.length) {
    const char = trimmedPattern[i]
    if (char === '\\' && i + 1 < trimmedPattern.length) {
      const next = trimmedPattern[i + 1]
      if (next === '*') { processed += ESCAPED_STAR_PLACEHOLDER; i += 2; continue }
      if (next === '\\') { processed += ESCAPED_BACKSLASH_PLACEHOLDER; i += 2; continue }
    }
    processed += char; i++
  }

  const escaped = processed.replace(/[.+?^${}()|[\]\\'"]/g, '\\$&')
  const withWildcards = escaped.replace(/\*/g, '.*')
  let regexPattern = withWildcards.replace(ESCAPED_STAR_PLACEHOLDER_RE, '\\*').replace(ESCAPED_BACKSLASH_PLACEHOLDER_RE, '\\\\')

  const unescapedStarCount = (processed.match(/\*/g) || []).length
  if (regexPattern.endsWith(' .*') && unescapedStarCount === 1) {
    regexPattern = regexPattern.slice(0, -3) + '( .*)?'
  }

  const regex = new RegExp(`^${regexPattern}$`, 's' + (caseInsensitive ? 'i' : ''))
  return regex.test(command)
}

export function parsePermissionRule(permissionRule: string): ShellPermissionRule {
  const prefix = permissionRuleExtractPrefix(permissionRule)
  if (prefix !== null) return { type: 'prefix', prefix }
  if (hasWildcards(permissionRule)) return { type: 'wildcard', pattern: permissionRule }
  return { type: 'exact', command: permissionRule }
}

export function suggestionForExactCommand(toolName: string, command: string): PermissionUpdate[] {
  return [{ type: 'addRules', rules: [{ toolName, ruleContent: command }], behavior: 'allow', destination: 'localSettings' }]
}

export function suggestionForPrefix(toolName: string, prefix: string): PermissionUpdate[] {
  return [{ type: 'addRules', rules: [{ toolName, ruleContent: `${prefix}:*` }], behavior: 'allow', destination: 'localSettings' }]
}
