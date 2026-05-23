/**
 * AppState React layer — adapted from CC's state/AppState.tsx
 *
 * Provides React context + hooks for reading and updating the global
 * application state. Uses QiLing's createStore (useSyncExternalStore-based)
 * so all state updates trigger React re-renders via the subscription model.
 *
 * improved: QiLing separates the store type (AppStateStore.ts) from the
 * React bindings (this file), matching best practice for testability. CC
 * keeps them interleaved.
 */

import React, { createContext, useContext, useCallback, useMemo } from 'react'
import { createAppStore, getDefaultAppState, type AppState, type AppStateStore } from './AppStateStore.js'
import { useSyncExternalStore } from 'react'

// ─── Context ──────────────────────────────────────────────────────────────────

const AppStateContext = createContext<AppStateStore | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

type ProviderProps = {
  children: React.ReactNode
  initialState?: Partial<AppState>
  store?: AppStateStore
}

export function AppStateProvider({ children, initialState, store }: ProviderProps): React.ReactNode {
  const storeRef = React.useRef<AppStateStore>(
    store ?? createAppStore(initialState),
  )
  return (
    <AppStateContext.Provider value={storeRef.current}>
      {children}
    </AppStateContext.Provider>
  )
}

// ─── Store accessor ───────────────────────────────────────────────────────────

function useAppStateStore(): AppStateStore {
  const store = useContext(AppStateContext)
  if (!store) throw new Error('useAppState must be used within AppStateProvider')
  return store
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Select a slice of AppState. Re-renders only when the selected slice changes.
 * Pass an identity selector `s => s` to read the full state.
 *
 * @example
 * const mode = useAppState(s => s.toolPermissionContext.mode)
 */
export function useAppState<T>(selector: (state: AppState) => T): T {
  const store = useAppStateStore()
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(getDefaultAppState()),
  )
}

/**
 * Returns a stable updater function. Accepts either a new partial state or
 * an updater function `(prev) => next`.
 */
export function useSetAppState(): (
  updater: Partial<AppState> | ((prev: AppState) => AppState),
) => void {
  const store = useAppStateStore()
  return useCallback(
    (updater) => {
      if (typeof updater === 'function') {
        store.setState(updater)
      } else {
        store.setState((prev) => ({ ...prev, ...updater }))
      }
    },
    [store],
  )
}

/**
 * Returns the full AppState snapshot.
 * Prefer `useAppState(selector)` for performance.
 */
export function useAppStateSnapshot(): AppState {
  return useAppState((s) => s)
}

/**
 * Returns the store directly for imperative reads/writes outside React.
 * Only use when you cannot access the React tree (e.g., in tool handlers).
 */
export function useAppStateStoreRef(): AppStateStore {
  return useAppStateStore()
}

// ─── Imperative API (for use outside React) ───────────────────────────────────

/** Module-level store for imperative access from tools/hooks/query. */
let _globalStore: AppStateStore | null = null

export function initGlobalAppStore(initial?: Partial<AppState>): AppStateStore {
  _globalStore = createAppStore(initial)
  return _globalStore
}

export function getGlobalAppStore(): AppStateStore {
  if (!_globalStore) _globalStore = createAppStore()
  return _globalStore
}

export function getAppState(): AppState {
  return getGlobalAppStore().getState()
}

export function setAppState(updater: Partial<AppState> | ((prev: AppState) => AppState)): void {
  const store = getGlobalAppStore()
  if (typeof updater === 'function') {
    store.setState(updater)
  } else {
    store.setState((prev) => ({ ...prev, ...updater }))
  }
}
