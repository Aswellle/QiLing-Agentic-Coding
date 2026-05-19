/**
 * Lightweight reactive store — direct port of CC's state/store.ts
 *
 * A minimal Zustand-style store with:
 * - getState(): read current value
 * - setState(updater): update with Object.is equality check (no-op if same)
 * - subscribe(listener): subscribe to changes, returns unsubscribe fn
 *
 * Compatible with React's useSyncExternalStore.
 * Used by compactWarningState, classifierApprovals, and other reactive
 * singletons that need both React and non-React access.
 */

type Listener = () => void
type OnChange<T> = (args: { newState: T; oldState: T }) => void

export type Store<T> = {
  getState: () => T
  setState: (updater: (prev: T) => T) => void
  subscribe: (listener: Listener) => () => void
}

export function createStore<T>(
  initialState: T,
  onChange?: OnChange<T>,
): Store<T> {
  let state = initialState
  const listeners = new Set<Listener>()

  return {
    getState: () => state,

    setState: (updater: (prev: T) => T) => {
      const prev = state
      const next = updater(prev)
      if (Object.is(next, prev)) return
      state = next
      onChange?.({ newState: next, oldState: prev })
      for (const listener of listeners) listener()
    },

    subscribe: (listener: Listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
