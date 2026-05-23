/**
 * AppState selectors — adapted from CC's state/selectors.ts
 *
 * Pure functions that derive computed values from AppState.
 * Keep selectors stateless and side-effect-free.
 *
 * CC version includes Swarm-specific selectors (getViewedTeammateTask,
 * getActiveAgentForInput) — omitted in QiLing as QiLing does not use
 * in-process Swarm teammates. Equivalent routing is handled by coordinator.
 */

import type { AppState, TaskState } from './AppStateStore.js'
import type { PermissionMode } from '../utils/permissions/PermissionMode.js'

// ─── Permission ───────────────────────────────────────────────────────────────

export function selectPermissionMode(state: AppState): PermissionMode {
  return state.toolPermissionContext.mode
}

export function selectIsYoloMode(state: AppState): boolean {
  return state.toolPermissionContext.mode === 'bypassPermissions'
}

export function selectIsPlanMode(state: AppState): boolean {
  return state.toolPermissionContext.mode === 'plan'
}

export function selectIsAcceptEditsMode(state: AppState): boolean {
  return state.toolPermissionContext.mode === 'acceptEdits'
}

// ─── Model ────────────────────────────────────────────────────────────────────

export function selectMainLoopModel(state: AppState): string | null {
  return state.mainLoopModelForSession ?? state.mainLoopModel
}

// ─── MCP ─────────────────────────────────────────────────────────────────────

export function selectMcpClients(state: AppState) {
  return state.mcp.clients
}

export function selectMcpTools(state: AppState) {
  return state.mcp.tools
}

export function selectConnectedMcpClients(state: AppState) {
  return state.mcp.clients.filter(c => c.type === 'connected')
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export function selectRunningTasks(state: AppState): TaskState[] {
  return Object.values(state.tasks).filter(t => t.status === 'running')
}

export function selectBackgroundedTasks(state: AppState): TaskState[] {
  return Object.values(state.tasks).filter(
    t => t.status === 'running' && t.isBackgrounded,
  )
}

export function selectTaskById(state: AppState, taskId: string): TaskState | undefined {
  return state.tasks[taskId]
}

export function selectHasActiveTasks(state: AppState): boolean {
  return Object.values(state.tasks).some(
    t => t.status === 'running' || t.status === 'pending',
  )
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function selectCurrentNotification(state: AppState) {
  return state.notifications.current
}

export function selectNotificationQueue(state: AppState) {
  return state.notifications.queue
}

// ─── Todos ───────────────────────────────────────────────────────────────────

export function selectTodosForAgent(state: AppState, agentId = ''): import('./AppStateStore.js').TodoList {
  return state.todos[agentId] ?? []
}

export function selectAllTodos(state: AppState) {
  return state.todos
}

// ─── Plugins ─────────────────────────────────────────────────────────────────

export function selectEnabledPlugins(state: AppState) {
  return state.plugins.enabled
}

export function selectPluginErrors(state: AppState) {
  return state.plugins.errors
}

export function selectPluginsNeedRefresh(state: AppState): boolean {
  return state.plugins.needsRefresh
}

// ─── Settings ────────────────────────────────────────────────────────────────

export function selectVerbose(state: AppState): boolean {
  return state.verbose
}

export function selectThinkingEnabled(state: AppState): boolean | undefined {
  return state.thinkingEnabled
}

export function selectFastMode(state: AppState): boolean {
  return state.fastMode ?? false
}

export function selectEffortValue(state: AppState) {
  return state.effortValue
}

// ─── Elicitation ─────────────────────────────────────────────────────────────

export function selectElicitationQueue(state: AppState) {
  return state.elicitation.queue
}

export function selectHasPendingElicitation(state: AppState): boolean {
  return state.elicitation.queue.length > 0
}
