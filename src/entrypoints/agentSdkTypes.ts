/**
 * Agent SDK types — STUB.
 * FROM CC: entrypoints/agentSdkTypes.js — only the types sessionHooks needs.
 */
export const HOOK_EVENTS = ["PreToolUse", "PostToolUse", "Stop"] as const;
export type HookEvent = (typeof HOOK_EVENTS)[number];
