/**
 * PermissionsManager — upgraded with CC's full rule matching system
 *
 * Phase 3 additions vs original:
 *  - shellRuleMatching: wildcard/prefix/exact rule parsing + matching
 *  - permissionRuleParser: "Tool(content)" wire format serialization
 *  - denialTracking: consecutive-denial circuit breaker
 *  - permissionExplainer: AI-powered command explanation (opt-in)
 *  - autoModeState: YOLO mode state tracking
 *  - yoloClassifier: auto-approve low-risk ops in YOLO mode
 */

import type { PermissionDecision, PermissionManager } from '../types/tool'
import type { Provider } from '../types/provider'
import { validatePath } from './pathValidation'
import { detectShadowedRules, formatShadowWarnings } from './shadowedRuleDetection'
import type { Settings } from '../settings/schema'
import { saveGlobalSettings } from '../settings/loader'
import {
  findMatchingRule,
  suggestionForExactCommand,
  suggestionForPrefix,
  parsePermissionRule,
} from './shellRuleMatching'
import {
  permissionRuleValueFromString,
  permissionRuleValueToString,
  escapeRuleContent,
} from './permissionRuleParser'
import { generatePermissionExplanation } from './permissionExplainer'
import { classifyYoloAction } from './yoloClassifier'
import { isAutoModeActive } from './autoModeState'
import type { PermissionUpdate } from './PermissionUpdate'

// ─── Auto-allow tools (read-only, provably safe) ─────────────────────────────

const AUTO_ALLOW_TOOLS = new Set([
  'FileRead', 'Glob', 'Grep', 'TodoRead',
  'NotebookRead', 'RepoMap',
  'AskUserQuestion', 'TaskList', 'TaskGet', 'TaskOutput',
  'CronList', 'ListMcpResources', 'ToolSearch', 'Sleep',
])

// FileEdit is auto-allowed because the diff is visible in the TUI
const AUTO_ALLOW_EDIT_TOOLS = new Set(['FileEdit'])

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractFilePath(toolName: string, input: unknown): string | null {
  if (typeof input !== 'object' || input === null) return null
  const obj = input as Record<string, unknown>
  const p = obj.file_path ?? obj.path ?? obj.filepath
  if (typeof p === 'string') return p
  if (toolName === 'FileWrite' && typeof obj.file_path === 'string') return obj.file_path
  return null
}

function extractCommand(input: unknown): string | null {
  if (typeof input !== 'object' || input === null) return null
  const obj = input as Record<string, unknown>
  return typeof obj.command === 'string' ? obj.command : null
}

/**
 * Match a rule list (from settings or session) against a tool+content.
 * Uses the new shellRuleMatching system: wildcard/prefix/exact.
 *
 * Rule format: "Bash(git *)" → toolName=Bash, ruleContent=git *
 *              "FileEdit"    → toolName=FileEdit, ruleContent=undefined (match all)
 */
function matchRuleList(
  ruleStrings: string[],
  toolName: string,
  ruleContent: string | null,
): boolean {
  for (const ruleStr of ruleStrings) {
    const parsed = permissionRuleValueFromString(ruleStr)
    if (!parsed || parsed.toolName !== toolName) continue

    // No ruleContent on the rule → matches all inputs for this tool
    if (!parsed.ruleContent) return true

    // Has ruleContent → must match the input command
    if (ruleContent !== null) {
      const rule = parsePermissionRule(parsed.ruleContent)
      const matched = matchRuleToContent(rule, ruleContent)
      if (matched) return true
    }
  }
  return false
}

function matchRuleToContent(
  rule: ReturnType<typeof parsePermissionRule>,
  content: string,
): boolean {
  switch (rule.type) {
    case 'exact':
      return rule.command === content
    case 'prefix':
      return content === rule.prefix ||
        content.startsWith(rule.prefix + ' ') ||
        content.startsWith(rule.prefix + '\t')
    case 'wildcard': {
      const { matchWildcardPattern } = require('./shellRuleMatching') as typeof import('./shellRuleMatching')
      return matchWildcardPattern(rule.pattern, content)
    }
  }
}

// ─── PermissionsManager ───────────────────────────────────────────────────────

export class PermissionsManager implements PermissionManager {
  private sessionAllows: string[] = []
  private sessionDenies: string[] = []
  private settings: Settings
  private _provider: Provider | null = null

  constructor(settings: Settings, provider?: Provider) {
    this.settings = settings
    this._provider = provider ?? null
  }

  /** Inject provider after construction (set by REPL on startup) */
  setProvider(provider: Provider): void {
    this._provider = provider
  }

  async check(toolName: string, input: unknown): Promise<PermissionDecision> {
    // ── 1. Auto-allow read-only tools ────────────────────────────────────────
    if (AUTO_ALLOW_TOOLS.has(toolName)) return { type: 'allow' }

    // ── 2. Path validation for file tools ────────────────────────────────────
    if (toolName === 'FileWrite' || toolName === 'FileEdit') {
      const filePath = extractFilePath(toolName, input)
      if (filePath) {
        const v = validatePath(filePath, 'write', process.cwd())
        if (!v.allowed) return { type: 'deny', reason: v.reason ?? 'Path validation failed' }
      }
      if (AUTO_ALLOW_EDIT_TOOLS.has(toolName)) return { type: 'allow' }
    }
    if (toolName === 'FileRead') {
      const filePath = extractFilePath(toolName, input)
      if (filePath) {
        const v = validatePath(filePath, 'read', process.cwd())
        if (!v.allowed) return { type: 'deny', reason: v.reason ?? 'Path not accessible' }
      }
      return { type: 'allow' }
    }

    // ── 3. Extract the "command" string for shell rule matching ──────────────
    const ruleContent = extractCommand(input) ??
      (typeof input === 'string' ? input : null)

    // ── 4. Session allow/deny rules ──────────────────────────────────────────
    if (matchRuleList(this.sessionDenies, toolName, ruleContent)) {
      return { type: 'deny', reason: `Denied by session rule for ${toolName}` }
    }
    if (matchRuleList(this.sessionAllows, toolName, ruleContent)) {
      return { type: 'allow' }
    }

    // ── 5. Settings allow/deny rules ─────────────────────────────────────────
    if (matchRuleList(this.settings.permissions.deny, toolName, ruleContent)) {
      return { type: 'deny', reason: `Denied by settings rule for ${toolName}` }
    }
    if (matchRuleList(this.settings.permissions.allow, toolName, ruleContent)) {
      return { type: 'allow' }
    }

    // ── 6. YOLO auto-mode (--yolo flag or QILING_YOLO=1) ────────────────────
    if (isAutoModeActive() && this._provider) {
      const signal = AbortSignal.timeout(5000)  // 5s timeout for classifier
      const yoloResult = await classifyYoloAction(toolName, input, this._provider, signal)
      if (yoloResult.behavior === 'allow') return { type: 'allow' }
      if (yoloResult.behavior === 'deny') {
        return { type: 'deny', reason: yoloResult.reason }
      }
      // 'ask' falls through to normal permission dialog
    }

    // ── 7. Build permission request description ──────────────────────────────
    const description = this.describeToolCall(toolName, input)
    return { type: 'ask', description }
  }

  recordDecision(
    toolName: string,
    pattern: string,
    decision: 'allow' | 'deny',
    scope: 'session' | 'project' | 'global'
  ): void {
    // Build rule string in "Tool(content)" format
    const ruleStr = pattern === '*'
      ? toolName
      : permissionRuleValueToString({ toolName, ruleContent: pattern })

    if (scope === 'session') {
      if (decision === 'allow') {
        this.sessionAllows.push(ruleStr)
      } else {
        this.sessionDenies.push(ruleStr)
      }
      return
    }

    const existing = this.settings.permissions[decision]
    if (!existing.includes(ruleStr)) {
      this.settings.permissions[decision] = [...existing, ruleStr]
      if (scope === 'global') {
        saveGlobalSettings({ permissions: this.settings.permissions })
      }
      // For 'project', the caller (PermissionDialog) writes .qiling/settings.json
    }
  }

  /** Get suggestions for allowing a tool call (exact + prefix variants) */
  suggestAllowRules(toolName: string, input: unknown): string[] {
    const cmd = extractCommand(input) ?? String(input)
    const firstWord = cmd.split(/\s+/)[0] ?? ''
    const results: string[] = [
      // Exact command
      permissionRuleValueToString({ toolName, ruleContent: cmd }),
      // First-word prefix (npm:*, git:*, etc.)
      firstWord ? permissionRuleValueToString({ toolName, ruleContent: `${firstWord}:*` }) : '',
      // Wildcard variant
      firstWord ? permissionRuleValueToString({ toolName, ruleContent: `${firstWord} *` }) : '',
      // Allow all for this tool
      toolName,
    ]
    return [...new Set(results.filter(Boolean))]
  }

  /** Check for unreachable (shadowed) rules */
  diagnoseRules(): string {
    const allRules = [
      ...this.settings.permissions.allow.map(r => {
        const p = permissionRuleValueFromString(r)
        return { toolName: p?.toolName ?? r, pattern: p?.ruleContent, decision: 'allow' as const, source: 'global' as const }
      }),
      ...this.settings.permissions.deny.map(r => {
        const p = permissionRuleValueFromString(r)
        return { toolName: p?.toolName ?? r, pattern: p?.ruleContent, decision: 'deny' as const, source: 'global' as const }
      }),
    ]
    const warnings = detectShadowedRules(allRules)
    return formatShadowWarnings(warnings)
  }

  private describeToolCall(toolName: string, input: unknown): string {
    if (typeof input !== 'object' || input === null) {
      return `Execute ${toolName}(${String(input)})`
    }
    const obj = input as Record<string, unknown>
    if ((toolName === 'Bash' || toolName === 'PowerShell') && typeof obj.command === 'string') {
      return `Run ${toolName === 'Bash' ? 'shell' : 'PowerShell'} command:\n  ${obj.command}`
    }
    if (toolName === 'FileWrite' && typeof obj.file_path === 'string') return `Write file: ${obj.file_path}`
    if (toolName === 'WebFetch' && typeof obj.url === 'string') return `Fetch URL: ${obj.url}`
    if (toolName === 'WebSearch' && typeof obj.query === 'string') return `Web search: "${obj.query}"`
    if (toolName === 'Agent') return 'Launch sub-agent task'
    if (toolName === 'EnterWorktree') return 'Create git worktree (isolated branch)'
    if (toolName === 'ExitWorktree') return `Exit worktree (action: ${(obj.action as string) ?? 'unknown'})`
    if (toolName.startsWith('mcp__')) return `MCP tool: ${toolName}`
    return `Execute ${toolName}`
  }
}
