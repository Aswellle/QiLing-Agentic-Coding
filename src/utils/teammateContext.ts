/**
 * Teammate context via AsyncLocalStorage — adapted from CC's utils/teammateContext.ts
 *
 * Provides isolated runtime context for in-process teammates, allowing concurrent
 * teammate execution without global state conflicts. AsyncLocalStorage ensures
 * each teammate's context is isolated across async boundaries.
 *
 * Identity priority (teammate.ts checks in this order):
 * 1. AsyncLocalStorage (in-process teammates) — this module
 * 2. dynamicTeamContext (tmux teammates via CLI args)
 * 3. QILING_AGENT_ID / CLAUDE_CODE_AGENT_ID env vars (process-level)
 */

import { AsyncLocalStorage } from 'node:async_hooks'

export type TeammateContext = {
  /** Full agent ID, e.g., "researcher@my-team" */
  agentId: string
  /** Display name, e.g., "researcher" */
  agentName: string
  /** Team name this teammate belongs to */
  teamName: string
  /** UI color assigned to this teammate */
  color?: string
  /** Whether this teammate requires plan-mode permissions */
  planModeRequired: boolean
  /** Session ID of the parent (team lead) */
  parentSessionId: string
  /** Abort controller for this teammate's lifecycle */
  abortController: AbortController
  /** Always true for in-process teammates */
  isInProcess: boolean
}

const teammateContextStorage = new AsyncLocalStorage<TeammateContext>()

export function getTeammateContext(): TeammateContext | undefined {
  return teammateContextStorage.getStore()
}

/**
 * Run fn with the given teammate context active.
 * Used when spawning an in-process teammate.
 */
export function runWithTeammateContext<T>(context: TeammateContext, fn: () => T): T {
  return teammateContextStorage.run(context, fn)
}

/**
 * Check if current execution is within an in-process teammate.
 * Faster than getTeammateContext() !== undefined for simple checks.
 */
export function isInProcessTeammate(): boolean {
  return teammateContextStorage.getStore() !== undefined
}

/**
 * Create a TeammateContext from spawn configuration.
 * The abortController should be independent (not linked to parent) so
 * teammates continue running when the leader's query is interrupted.
 */
export function createTeammateContext(config: {
  agentId: string
  agentName: string
  teamName: string
  color?: string
  planModeRequired: boolean
  parentSessionId: string
  abortController: AbortController
}): TeammateContext {
  return { ...config, isInProcess: true }
}
