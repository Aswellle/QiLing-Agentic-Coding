/**
 * Tiny event signal primitive — ported from CC's utils/signal.ts (verbatim)
 *
 * Collapses the "new Set + subscribe + notify" boilerplate into a one-liner.
 * Use when subscribers only need to know "something happened", not the current value.
 *
 * Usage:
 *   const changed = createSignal<[string]>()
 *   const unsub = changed.subscribe(src => console.log('changed:', src))
 *   changed.emit('userSettings')
 *   unsub()  // unsubscribe
 */

export type Signal<Args extends unknown[] = []> = {
  subscribe: (listener: (...args: Args) => void) => () => void
  emit: (...args: Args) => void
  clear: () => void
}

export function createSignal<Args extends unknown[] = []>(): Signal<Args> {
  const listeners = new Set<(...args: Args) => void>()
  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    emit(...args) {
      for (const listener of listeners) listener(...args)
    },
    clear() {
      listeners.clear()
    },
  }
}
