/**
 * Teammate view helpers — adapted from CC's state/teammateViewHelpers.ts
 *
 * CC version: helpers for the in-process Swarm teammate view (which teammate
 * is foregrounded, Inbox navigation, etc.).
 *
 * QiLing: QiLing's coordinator mode uses external processes (tmux/subprocess)
 * rather than CC's in-process Swarm. These helpers are stubs — they become
 * relevant when QiLing adds its own teammate view in Phase D.
 */

import type { AppState } from './AppStateStore.js'

/** Returns the task ID currently foregrounded in the main view, if any. */
export function getForegroundedTaskId(state: AppState): string | undefined {
  // QiLing stub: no in-process teammate view yet
  return (state as AppState & { foregroundedTaskId?: string }).foregroundedTaskId
}

/** Returns whether the user is currently viewing a teammate transcript. */
export function isViewingTeammate(state: AppState): boolean {
  // QiLing stub: no in-process teammate view yet
  return false
}

/** Returns the task ID whose transcript is being viewed, if any. */
export function getViewingAgentTaskId(state: AppState): string | undefined {
  // QiLing stub: no in-process teammate view yet
  return (state as AppState & { viewingAgentTaskId?: string }).viewingAgentTaskId
}
