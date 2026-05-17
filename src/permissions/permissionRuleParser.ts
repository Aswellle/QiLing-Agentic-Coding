/**
 * Permission rule value serialization — ported from CC's permissionRuleParser.ts
 *
 * Handles the "Tool(content)" wire format for permission rules.
 * Example: "Bash(git commit)" → { toolName: "Bash", ruleContent: "git commit" }
 *
 * Parentheses in content are escaped: "Bash(npm run build())" →
 * "Bash(npm run build\(\))"
 */

import type { PermissionRuleValue } from './PermissionUpdate'

// ─── Escaping ─────────────────────────────────────────────────────────────────

/**
 * Escape special chars in rule content for safe storage in "Tool(content)" format.
 * Escaping order: backslashes first, then parentheses.
 */
export function escapeRuleContent(content: string): string {
  return content
    .replace(/\\/g, '\\\\')  // \ → \\
    .replace(/\(/g, '\\(')   // ( → \(
    .replace(/\)/g, '\\)')   // ) → \)
}

/**
 * Unescape rule content after parsing (reverse of escapeRuleContent).
 */
export function unescapeRuleContent(content: string): string {
  return content
    .replace(/\\\(/g, '(')   // \( → (
    .replace(/\\\)/g, ')')   // \) → )
    .replace(/\\\\/g, '\\')  // \\ → \
}

// ─── Serialization ────────────────────────────────────────────────────────────

/**
 * Serialize a PermissionRuleValue to wire format: "Bash" or "Bash(git *)"
 */
export function permissionRuleValueToString(rule: PermissionRuleValue): string {
  if (!rule.ruleContent) return rule.toolName
  return `${rule.toolName}(${escapeRuleContent(rule.ruleContent)})`
}

/**
 * Parse a wire-format rule string back to PermissionRuleValue.
 * Returns null if the string is malformed.
 *
 * Examples:
 *   "Bash"           → { toolName: "Bash" }
 *   "Bash(git *)"    → { toolName: "Bash", ruleContent: "git *" }
 *   "FileEdit"       → { toolName: "FileEdit" }
 */
export function permissionRuleValueFromString(
  ruleString: string,
): PermissionRuleValue | null {
  if (!ruleString) return null

  // Check for Tool(content) format — find the first unescaped '('
  const parenIdx = findUnescapedParen(ruleString)
  if (parenIdx === -1) {
    // No parentheses — just a tool name
    return { toolName: ruleString.trim() }
  }

  const toolName = ruleString.slice(0, parenIdx).trim()
  if (!toolName) return null

  // Must end with unescaped ')'
  if (!ruleString.endsWith(')')) return null

  const innerEscaped = ruleString.slice(parenIdx + 1, -1)
  const ruleContent = unescapeRuleContent(innerEscaped)

  return { toolName, ruleContent }
}

/** Find the index of the first unescaped '(' in a string */
function findUnescapedParen(s: string): number {
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(' && (i === 0 || s[i - 1] !== '\\')) return i
  }
  return -1
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a permission rule string for a Bash/PowerShell command.
 * Usage: getRuleByContentsForTool('Bash', 'git commit')
 *   → "Bash(git commit)"
 */
export function getRuleByContentsForTool(
  toolName: string,
  ruleContent: string,
): string {
  return permissionRuleValueToString({ toolName, ruleContent })
}

/**
 * Check whether a rule string applies to the given tool.
 */
export function ruleAppliesToTool(ruleString: string, toolName: string): boolean {
  const parsed = permissionRuleValueFromString(ruleString)
  return parsed?.toolName === toolName
}

/**
 * Extract the rule content (command pattern) from a rule string, if any.
 */
export function extractRuleContent(ruleString: string): string | null {
  const parsed = permissionRuleValueFromString(ruleString)
  return parsed?.ruleContent ?? null
}
