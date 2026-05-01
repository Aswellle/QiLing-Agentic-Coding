import type { PermissionDecision } from '../types/tool'

// Glob-style pattern matching for permission rules
// Rule format: "ToolName(pattern)" or "ToolName" or "*"
// Examples: "Bash(git *)", "FileEdit(src/*.ts)", "*"

function globMatch(pattern: string, value: string): boolean {
  // Convert glob pattern to regex
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  const regex = new RegExp(`^${escaped}$`, 'i')
  return regex.test(value)
}

function parseRule(rule: string): { toolName: string; argPattern: string | null } {
  const match = rule.match(/^([^(]+)(?:\((.+)\))?$/)
  if (!match) return { toolName: rule.trim(), argPattern: null }
  return {
    toolName: match[1].trim(),
    argPattern: match[2]?.trim() ?? null,
  }
}

function stringifyInput(toolName: string, input: unknown): string {
  if (typeof input === 'string') return input
  if (typeof input !== 'object' || input === null) return String(input)

  // For Bash/PowerShell, the relevant field is 'command'
  if (toolName === 'Bash' || toolName === 'PowerShell') {
    const cmd = (input as Record<string, unknown>).command
    return typeof cmd === 'string' ? cmd : JSON.stringify(input)
  }

  // For file tools, the relevant field is 'path' or 'file_path'
  const obj = input as Record<string, unknown>
  const path = obj.path ?? obj.file_path ?? obj.filepath
  if (typeof path === 'string') return path

  return JSON.stringify(input)
}

export function evaluateRules(
  rules: string[],
  toolName: string,
  input: unknown
): boolean {
  const inputStr = stringifyInput(toolName, input)

  for (const rule of rules) {
    const { toolName: ruleTool, argPattern } = parseRule(rule)

    // Tool name must match (or rule is wildcard)
    const toolMatches =
      ruleTool === '*' ||
      globMatch(ruleTool, toolName)

    if (!toolMatches) continue

    // If no arg pattern, the rule matches on tool name alone
    if (!argPattern) return true

    // Arg pattern must match the input string
    if (globMatch(argPattern, inputStr)) return true
  }

  return false
}

export function checkRules(
  allowRules: string[],
  denyRules: string[],
  toolName: string,
  input: unknown
): PermissionDecision | null {
  // Deny rules take highest priority
  if (denyRules.length > 0 && evaluateRules(denyRules, toolName, input)) {
    return { type: 'deny', reason: `Denied by rule for ${toolName}` }
  }

  // Allow rules
  if (allowRules.length > 0 && evaluateRules(allowRules, toolName, input)) {
    return { type: 'allow' }
  }

  return null // No rule matched → caller must ask user
}
