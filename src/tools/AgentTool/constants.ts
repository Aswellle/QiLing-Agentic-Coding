// In its own file to avoid circular dependencies — CC pattern
export const AGENT_TOOL_NAME = 'Agent'

// Legacy wire name for backward compat (permission rules, hooks, resumed sessions)
export const LEGACY_AGENT_TOOL_NAME = 'Task'

export const VERIFICATION_AGENT_TYPE = 'verification'

// Built-in agents that run once and return a report.
// These skip the agentId/SendMessage/usage trailer to save tokens.
export const ONE_SHOT_BUILTIN_AGENT_TYPES: ReadonlySet<string> = new Set([
  'Explore',
  'Plan',
])
