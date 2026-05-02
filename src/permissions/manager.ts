import type { PermissionDecision, PermissionManager } from '../types/tool'
import { checkRules, stringifyInput, suggestExactRule, suggestPrefixRule } from './rules'
import { validatePath } from './pathValidation'
import { detectShadowedRules, formatShadowWarnings } from './shadowedRuleDetection'
import type { Settings } from '../settings/schema'
import { saveGlobalSettings } from '../settings/loader'

// ─── Auto-allow / auto-deny sets ─────────────────────────────────────────────

// Read-only tools — never need confirmation
const AUTO_ALLOW_TOOLS = new Set([
  'FileRead', 'Glob', 'Grep', 'TodoRead',
  'NotebookRead', 'RepoMap',
  // Coordination & scheduling — read-only side effects
  'AskUserQuestion', 'TaskList', 'TaskGet', 'TaskOutput',
  'CronList', 'ListMcpResources', 'ToolSearch',
])

// File-edit tools — allow by default (user sees diff in TUI)
const AUTO_ALLOW_EDIT_TOOLS = new Set(['FileEdit'])

// Tools that always need confirmation if no rule has fired
const REQUIRE_CONFIRM_TOOLS = new Set([
  'Bash', 'PowerShell', 'FileWrite',
  'WebFetch', 'WebSearch', 'Agent',
  'EnterWorktree', 'ExitWorktree',
])

// ─── File path extraction helpers ────────────────────────────────────────────

function extractFilePath(toolName: string, input: unknown): string | null {
  if (typeof input !== 'object' || input === null) return null
  const obj = input as Record<string, unknown>
  const p = obj.file_path ?? obj.path ?? obj.filepath
  if (typeof p === 'string') return p
  if (toolName === 'FileWrite' && typeof obj.file_path === 'string') return obj.file_path
  return null
}

// ─── Manager ──────────────────────────────────────────────────────────────────

export class PermissionsManager implements PermissionManager {
  private sessionAllows: Map<string, string[]> = new Map()
  private sessionDenies: Map<string, string[]> = new Map()
  private settings: Settings

  constructor(settings: Settings) {
    this.settings = settings
  }

  async check(toolName: string, input: unknown): Promise<PermissionDecision> {
    // ── 1. Auto-allow read-only tools ────────────────────────────────────────
    if (AUTO_ALLOW_TOOLS.has(toolName)) {
      return { type: 'allow' }
    }

    // ── 2. Path validation for file-writing tools ────────────────────────────
    if (toolName === 'FileWrite' || toolName === 'FileEdit') {
      const filePath = extractFilePath(toolName, input)
      if (filePath) {
        const op = toolName === 'FileEdit' ? 'write' : 'write'
        const validation = validatePath(filePath, op, process.cwd())
        if (!validation.allowed) {
          return { type: 'deny', reason: validation.reason ?? 'Path validation failed' }
        }
      }
      if (AUTO_ALLOW_EDIT_TOOLS.has(toolName)) return { type: 'allow' }
    }

    // ── 3. FileRead path validation ──────────────────────────────────────────
    if (toolName === 'FileRead') {
      const filePath = extractFilePath(toolName, input)
      if (filePath) {
        const validation = validatePath(filePath, 'read', process.cwd())
        if (!validation.allowed) {
          return { type: 'deny', reason: validation.reason ?? 'Path not accessible' }
        }
      }
      return { type: 'allow' }
    }

    // ── 4. Session-level rules ───────────────────────────────────────────────
    const allSessionAllows: string[] = []
    const allSessionDenies: string[] = []
    for (const [, v] of this.sessionAllows) allSessionAllows.push(...v)
    for (const [, v] of this.sessionDenies) allSessionDenies.push(...v)

    const sessionResult = checkRules(allSessionAllows, allSessionDenies, toolName, input)
    if (sessionResult) return sessionResult

    // ── 5. Settings-level rules ──────────────────────────────────────────────
    const settingsResult = checkRules(
      this.settings.permissions.allow,
      this.settings.permissions.deny,
      toolName,
      input
    )
    if (settingsResult) return settingsResult

    // ── 6. Tools requiring confirmation ─────────────────────────────────────
    if (REQUIRE_CONFIRM_TOOLS.has(toolName)) {
      return {
        type: 'ask',
        description: this.describeToolCall(toolName, input),
      }
    }

    // MCP tools always ask by default
    if (toolName.startsWith('mcp__')) {
      return {
        type: 'ask',
        description: `Run MCP tool: ${toolName}`,
      }
    }

    // ── 7. Unknown tool — ask
    return {
      type: 'ask',
      description: `Execute ${toolName}?`,
    }
  }

  recordDecision(
    toolName: string,
    pattern: string,
    decision: 'allow' | 'deny',
    scope: 'session' | 'project' | 'global'
  ): void {
    if (scope === 'session') {
      const map = decision === 'allow' ? this.sessionAllows : this.sessionDenies
      const existing = map.get(toolName) ?? []
      map.set(toolName, [...existing, pattern])
      return
    }

    const ruleKey = pattern === '*' ? toolName : `${toolName}(${pattern})`
    const existing = this.settings.permissions[decision]
    if (!existing.includes(ruleKey)) {
      this.settings.permissions[decision] = [...existing, ruleKey]
      if (scope === 'global') {
        saveGlobalSettings({ permissions: this.settings.permissions })
      }
    }
  }

  /** Check for unreachable rules and return formatted warnings */
  diagnoseRules(): string {
    const rules = [
      ...this.settings.permissions.allow.map(r => ({
        toolName: r.split('(')[0].trim(),
        pattern: r.includes('(') ? r.match(/\((.+)\)/)?.[1] : undefined,
        decision: 'allow' as const,
        source: 'global' as const,
      })),
      ...this.settings.permissions.deny.map(r => ({
        toolName: r.split('(')[0].trim(),
        pattern: r.includes('(') ? r.match(/\((.+)\)/)?.[1] : undefined,
        decision: 'deny' as const,
        source: 'global' as const,
      })),
    ]
    const warnings = detectShadowedRules(rules)
    return formatShadowWarnings(warnings)
  }

  /** Generate a suggested allow rule for the given tool+input */
  suggestAllowRule(toolName: string, input: unknown): { exact: string; prefix: string } {
    const inputStr = stringifyInput(toolName, input)
    const parts = inputStr.split(' ')
    const prefix = parts[0] ?? toolName
    return {
      exact: suggestExactRule(toolName, inputStr),
      prefix: parts.length > 1 ? suggestPrefixRule(toolName, prefix) : suggestExactRule(toolName, inputStr),
    }
  }

  private describeToolCall(toolName: string, input: unknown): string {
    if (typeof input !== 'object' || input === null) {
      return `Execute ${toolName}(${String(input)})`
    }
    const obj = input as Record<string, unknown>

    if ((toolName === 'Bash' || toolName === 'PowerShell') && typeof obj.command === 'string') {
      return `Run ${toolName === 'Bash' ? 'shell' : 'PowerShell'} command:\n  ${obj.command}`
    }
    if (toolName === 'FileWrite' && typeof obj.file_path === 'string') {
      return `Write file: ${obj.file_path}`
    }
    if (toolName === 'WebFetch' && typeof obj.url === 'string') {
      return `Fetch URL: ${obj.url}`
    }
    if (toolName === 'WebSearch' && typeof obj.query === 'string') {
      return `Web search: "${obj.query}"`
    }
    if (toolName === 'Agent') return 'Launch sub-agent task'
    if (toolName === 'EnterWorktree') return 'Create git worktree (isolated branch)'
    if (toolName === 'ExitWorktree') {
      const action = (obj.action as string) ?? 'unknown'
      return `Exit worktree (action: ${action})`
    }
    if (toolName.startsWith('mcp__')) {
      return `MCP tool: ${toolName}`
    }
    return `Execute ${toolName}`
  }
}
