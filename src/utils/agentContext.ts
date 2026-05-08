/**
 * Agent context tracking — inspired by CC's utils/agentContext.ts
 *
 * Uses AsyncLocalStorage to track agent IDs across async tool executions.
 * Allows sub-agents to know their identity without threading context explicitly.
 */

import { AsyncLocalStorage } from 'async_hooks'

export type AgentContext = {
  agentId: string
  parentAgentId?: string
  isSubagent: boolean
}

const agentContextStorage = new AsyncLocalStorage<AgentContext>()

/** Get the current agent context (undefined if running in main thread). */
export function getAgentContext(): AgentContext | undefined {
  return agentContextStorage.getStore()
}

/** Get the current agent ID or a default value. */
export function getAgentId(defaultId = 'main'): string {
  return agentContextStorage.getStore()?.agentId ?? defaultId
}

/** Run a function in the context of a specific agent. */
export function runWithAgentContext<T>(context: AgentContext, fn: () => T): T {
  return agentContextStorage.run(context, fn)
}

/** Check if currently running in a sub-agent context. */
export function isSubagentContext(): boolean {
  return agentContextStorage.getStore()?.isSubagent ?? false
}
