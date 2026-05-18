/**
 * Working directory helpers — adapted from CC's utils/cwd.ts
 *
 * CC uses AsyncLocalStorage to allow concurrent sub-agents to each have their
 * own working directory without affecting each other. QiLing supports the same
 * pattern.
 *
 * Usage: wrap a tool call in `runWithCwdOverride(agentCwd, () => tool.call(...))`
 * to give that async subtree its own cwd view.
 */

import { AsyncLocalStorage } from 'node:async_hooks'

const cwdOverrideStorage = new AsyncLocalStorage<string>()

/**
 * Run a function with an overridden working directory for the current async context.
 * All calls to getCwd() within the function (and its async descendants) will
 * return the overridden cwd. Enables concurrent agents to each see their own cwd.
 */
export function runWithCwdOverride<T>(cwd: string, fn: () => T): T {
  return cwdOverrideStorage.run(cwd, fn)
}

/**
 * Get the current working directory for the current async context.
 * Returns the async-local override if set, otherwise process.cwd().
 */
export function getCwd(): string {
  return cwdOverrideStorage.getStore() ?? process.cwd()
}

/** Alias — matches CC's pwd() export. */
export const pwd = getCwd
