/**
 * AppState change side effects — adapted from CC's state/onChangeAppState.ts
 *
 * Called after every state mutation to propagate changes to imperative sinks:
 *   - bootstrap/state.ts (model override, session metadata)
 *   - Permission mode change callbacks
 *
 * CC version (172L) syncs to: Bridge external_metadata, SDK permissionMode,
 * auth credential caches, managedEnv, settings. Many are ANT-specific.
 *
 * QiLing version: syncs to bootstrap/state.ts and logs debug info.
 * ANT-specific sinks (Bridge, managedEnv, auth credential caches) are omitted.
 */

import {
  setMainLoopModelOverride,
  setIsRemoteMode,
} from '../bootstrap/state.js'
import { logForDebugging } from '../utils/log.js'
import type { AppState } from './AppStateStore.js'

// ─── Main handler ─────────────────────────────────────────────────────────────

export function onChangeAppState({
  newState,
  oldState,
}: {
  newState: AppState
  oldState: AppState
}): void {
  // ── Permission mode ────────────────────────────────────────────────────────
  // Single choke point: all mode mutations (Shift+Tab, /plan, ExitPlanMode,
  // bridge set_permission_mode) flow through AppState → here.
  if (newState.toolPermissionContext.mode !== oldState.toolPermissionContext.mode) {
    const newMode = newState.toolPermissionContext.mode
    logForDebugging(`[AppState] permissionMode: ${oldState.toolPermissionContext.mode} → ${newMode}`)
    // Future: notify external mode change listeners here (SDK, Bridge)
  }

  // ── Model override ─────────────────────────────────────────────────────────
  if (newState.mainLoopModelForSession !== oldState.mainLoopModelForSession) {
    const m = newState.mainLoopModelForSession
    if (m !== null && m !== undefined) {
      setMainLoopModelOverride({ model: m })
    } else {
      setMainLoopModelOverride(undefined)
    }
    logForDebugging(`[AppState] modelForSession: ${oldState.mainLoopModelForSession} → ${m}`)
  }

  // ── Remote mode ───────────────────────────────────────────────────────────
  // Not currently used in QiLing but wired for future Bridge integration.
  const wasRemote = !!(oldState as AppState & { remoteSessionUrl?: string }).remoteSessionUrl
  const isRemote  = !!(newState as AppState & { remoteSessionUrl?: string }).remoteSessionUrl
  if (wasRemote !== isRemote) {
    setIsRemoteMode(isRemote)
  }
}

// ─── externalMetadataToAppState ───────────────────────────────────────────────

/**
 * Restore session state from external metadata (Bridge reconnect / resume).
 * Adapted from CC's externalMetadataToAppState. QiLing handles only the
 * fields that are relevant to its own session model.
 */
export function externalMetadataToAppState(
  metadata: Record<string, unknown>,
): (prev: AppState) => AppState {
  return prev => {
    const updates: Partial<AppState> = {}

    if (typeof metadata.permission_mode === 'string') {
      const mode = metadata.permission_mode as AppState['toolPermissionContext']['mode']
      updates.toolPermissionContext = {
        ...prev.toolPermissionContext,
        mode,
      }
    }

    if (typeof metadata.model === 'string') {
      updates.mainLoopModelForSession = metadata.model
    }

    if (typeof metadata.fast_mode === 'boolean') {
      updates.fastMode = metadata.fast_mode
    }

    return { ...prev, ...updates }
  }
}
