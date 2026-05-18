/**
 * Turn-scoped workload tag via AsyncLocalStorage — adapted from CC's utils/workloadContext.ts
 *
 * Used to tag async work chains (e.g., cron tasks) so they can be identified
 * in analytics and profiling without global state collisions. AsyncLocalStorage
 * ensures the tag is isolated to the specific async chain, even when multiple
 * agents yield concurrently.
 *
 * Same pattern as agentContext.ts in this codebase.
 */

import { AsyncLocalStorage } from 'node:async_hooks'

export type Workload = 'cron'
export const WORKLOAD_CRON: Workload = 'cron'

const workloadStorage = new AsyncLocalStorage<{ workload: Workload | undefined }>()

/**
 * Run a function in a workload context. All calls to getWorkload() within
 * the function (and its async descendants) return the given workload tag.
 */
export function withWorkload<T>(workload: Workload, fn: () => T): T {
  return workloadStorage.run({ workload }, fn)
}

/**
 * Get the workload tag for the current async context.
 * Returns undefined if not inside a withWorkload() call.
 */
export function getWorkload(): Workload | undefined {
  return workloadStorage.getStore()?.workload
}
