/**
 * Task status display utilities — adapted from CC's components/tasks/taskStatusUtils.tsx
 *
 * Icon and color selectors for task status, plus teammate activity descriptions.
 */

import figures from 'figures'

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'killed' | 'in_progress'

export function isTerminalStatus(status: TaskStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'killed'
}

type StatusOptions = {
  isIdle?: boolean
  awaitingApproval?: boolean
  hasError?: boolean
  shutdownRequested?: boolean
}

/**
 * Returns the appropriate icon for a task based on status and state flags.
 */
export function getTaskStatusIcon(status: TaskStatus, options?: StatusOptions): string {
  const { isIdle, awaitingApproval, hasError, shutdownRequested } = options ?? {}

  if (hasError) return figures.cross
  if (awaitingApproval) return figures.questionMarkPrefix
  if (shutdownRequested) return figures.warning

  if (status === 'running' || status === 'in_progress') {
    if (isIdle) return figures.ellipsis
    return figures.play
  }
  if (status === 'completed') return figures.tick
  if (status === 'failed' || status === 'killed') return figures.cross
  return figures.bullet
}

/**
 * Returns the semantic color for a task status.
 */
export function getTaskStatusColor(
  status: TaskStatus,
  options?: StatusOptions,
): 'success' | 'error' | 'warning' | undefined {
  const { isIdle, awaitingApproval, hasError, shutdownRequested } = options ?? {}

  if (hasError) return 'error'
  if (awaitingApproval) return 'warning'
  if (shutdownRequested) return 'warning'
  if (isIdle) return undefined

  if (status === 'completed') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'killed') return 'warning'
  return undefined
}
