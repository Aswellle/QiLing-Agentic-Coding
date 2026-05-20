/**
 * SDK core types — adapted from CC's entrypoints/sdk/coreTypes.ts
 *
 * Common serializable types for SDK consumers.
 * HOOK_EVENTS and EXIT_REASONS are const arrays for runtime use.
 */

export const HOOK_EVENTS = [
  'PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'Notification',
  'UserPromptSubmit', 'SessionStart', 'SessionEnd', 'Stop', 'StopFailure',
  'SubagentStart', 'SubagentStop', 'PreCompact', 'PostCompact',
  'PermissionRequest', 'PermissionDenied', 'Setup', 'TeammateIdle',
  'TaskCreated', 'TaskCompleted', 'Elicitation', 'ElicitationResult',
  'ConfigChange', 'WorktreeCreate', 'WorktreeRemove', 'InstructionsLoaded',
  'CwdChanged', 'FileChanged',
] as const

export type HookEvent = (typeof HOOK_EVENTS)[number]

export const EXIT_REASONS = [
  'clear', 'resume', 'logout', 'prompt_input_exit', 'other', 'bypass_permissions_disabled',
] as const

export type ExitReason = (typeof EXIT_REASONS)[number]
