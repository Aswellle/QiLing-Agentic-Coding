import type { PermissionDecision, PermissionManager } from '../types/tool'
import { checkRules } from './rules'
import type { Settings } from '../settings/schema'
import { saveGlobalSettings } from '../settings/loader'

// Tools that are always safe (read-only operations)
const AUTO_ALLOW_TOOLS = new Set(['FileRead', 'Glob', 'Grep', 'TodoRead'])

// Tools that are never auto-allowed (destructive or network)
const REQUIRE_CONFIRM_TOOLS = new Set(['Bash', 'PowerShell', 'FileWrite', 'WebFetch', 'Agent'])

export class PermissionsManager implements PermissionManager {
  private sessionAllows: Map<string, string[]> = new Map()
  private sessionDenies: Map<string, string[]> = new Map()
  private settings: Settings

  constructor(settings: Settings) {
    this.settings = settings
  }

  async check(toolName: string, input: unknown): Promise<PermissionDecision> {
    // Always-safe read-only tools
    if (AUTO_ALLOW_TOOLS.has(toolName)) {
      return { type: 'allow' }
    }

    // FileEdit — safe to allow by default (user can see diff)
    if (toolName === 'FileEdit') {
      return { type: 'allow' }
    }

    // Check session-level decisions first
    const sessionResult = checkRules(
      this.sessionAllows.get(toolName) ?? [],
      this.sessionDenies.get(toolName) ?? [],
      toolName,
      input
    )
    if (sessionResult) return sessionResult

    // Check settings-level rules (project + global merged)
    const settingsResult = checkRules(
      this.settings.permissions.allow,
      this.settings.permissions.deny,
      toolName,
      input
    )
    if (settingsResult) return settingsResult

    // Tools that always require confirmation if no rule matched
    if (REQUIRE_CONFIRM_TOOLS.has(toolName)) {
      return {
        type: 'ask',
        description: this.describeToolCall(toolName, input),
      }
    }

    // Unknown tools default to asking
    return {
      type: 'ask',
      description: `Run ${toolName}?`,
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

    // For project/global, update settings file
    const ruleKey = pattern === '*'
      ? toolName
      : `${toolName}(${pattern})`

    const existing = this.settings.permissions[decision]
    if (!existing.includes(ruleKey)) {
      const updated = [...existing, ruleKey]
      this.settings.permissions[decision] = updated

      if (scope === 'global') {
        saveGlobalSettings({
          permissions: this.settings.permissions,
        })
      }
      // project scope: caller is responsible for writing .qiling/settings.json
    }
  }

  private describeToolCall(toolName: string, input: unknown): string {
    if (typeof input !== 'object' || input === null) {
      return `Execute ${toolName}(${String(input)})`
    }
    const obj = input as Record<string, unknown>

    if (toolName === 'Bash' && typeof obj.command === 'string') {
      return `Run shell command:\n  ${obj.command}`
    }
    if (toolName === 'PowerShell' && typeof obj.command === 'string') {
      return `Run PowerShell command:\n  ${obj.command}`
    }
    if (toolName === 'FileWrite' && typeof obj.file_path === 'string') {
      return `Write file: ${obj.file_path}`
    }
    if (toolName === 'WebFetch' && typeof obj.url === 'string') {
      return `Fetch URL: ${obj.url}`
    }
    if (toolName === 'Agent') {
      return `Launch sub-agent task`
    }
    return `Execute ${toolName}`
  }
}
