/**
 * Shadowed rule detection — ported from CC's shadowedRuleDetection.ts.
 *
 * Finds rules that can never be reached because a broader rule earlier
 * in the chain already handles the same tool/pattern.
 *
 *  Ask-shadowing:  Bash(ask) + Bash(ls:allow) → the allow is unreachable
 *  Deny-shadowing: Bash(deny) + Bash(ls:allow) → the allow is permanently blocked
 */

export type RuleSource = 'session' | 'project' | 'global' | 'cli'
export type RuleDecision = 'allow' | 'deny' | 'ask'

export interface PermissionRule {
  toolName: string        // e.g. "Bash", "FileEdit", "*"
  pattern?: string        // e.g. "ls *", "*.ts"
  decision: RuleDecision
  source: RuleSource
}

export interface ShadowWarning {
  type: 'ask-shadowed' | 'deny-shadowed'
  blockedRule: PermissionRule
  shadowingRule: PermissionRule
  message: string
  fixSuggestion: string
}

/** Returns true for rules that came from shared / policy config — higher severity */
function isSharedSource(source: RuleSource): boolean {
  return source === 'project' || source === 'global'
}

/**
 * Check if a broad rule (no pattern, or * pattern) shadows a specific rule.
 * A broad rule on tool "X" with decision D shadows X(specific) with different decision.
 */
function isBroadRule(rule: PermissionRule): boolean {
  return !rule.pattern || rule.pattern === '*' || rule.pattern === ''
}

export function detectShadowedRules(rules: PermissionRule[]): ShadowWarning[] {
  const warnings: ShadowWarning[] = []

  // For each specific allow rule, check if a broader ask/deny rule precedes it
  for (let i = 0; i < rules.length; i++) {
    const specific = rules[i]
    if (specific.decision !== 'allow' || isBroadRule(specific)) continue

    // Look for earlier broad rules on the same tool
    for (let j = 0; j < i; j++) {
      const broad = rules[j]
      if (broad.toolName !== specific.toolName && broad.toolName !== '*') continue
      if (!isBroadRule(broad)) continue

      if (broad.decision === 'ask') {
        // Ask-shadowing: the allow rule is unreachable because every call goes through ask first
        const onlyWarnShared = !isSharedSource(specific.source) && !isSharedSource(broad.source)
        if (!onlyWarnShared || isSharedSource(broad.source)) {
          warnings.push({
            type: 'ask-shadowed',
            blockedRule: specific,
            shadowingRule: broad,
            message:
              `Rule "${specific.toolName}(${specific.pattern ?? ''})=allow" is unreachable because ` +
              `"${broad.toolName}=ask" (source: ${broad.source}) catches all calls first.`,
            fixSuggestion:
              `Remove the ask rule for "${broad.toolName}" in your ${broad.source} settings, ` +
              `or change it to be more specific.`,
          })
        }
      } else if (broad.decision === 'deny') {
        // Deny-shadowing: the allow rule can never fire
        warnings.push({
          type: 'deny-shadowed',
          blockedRule: specific,
          shadowingRule: broad,
          message:
            `Rule "${specific.toolName}(${specific.pattern ?? ''})=allow" is permanently blocked because ` +
            `"${broad.toolName}=deny" (source: ${broad.source}) blocks all calls.`,
          fixSuggestion:
            `Remove the deny rule for "${broad.toolName}" in your ${broad.source} settings, ` +
            `or scope it to a specific pattern.`,
        })
      }
    }
  }

  return warnings
}

/** Format warnings for display in /doctor command or settings diagnostics */
export function formatShadowWarnings(warnings: ShadowWarning[]): string {
  if (warnings.length === 0) return 'No shadowed permission rules detected.'
  return [
    `Found ${warnings.length} shadowed permission rule(s):`,
    '',
    ...warnings.map((w, i) =>
      `${i + 1}. [${w.type}] ${w.message}\n   Fix: ${w.fixSuggestion}`
    ),
  ].join('\n')
}
