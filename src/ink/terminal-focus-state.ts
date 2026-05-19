/**
 * Terminal focus state signal — adapted from CC's ink/terminal-focus-state.ts
 *
 * Non-React module for tracking terminal window focus via DECSET 1004.
 * 'unknown' = terminal doesn't support focus reporting (treat as focused).
 * Subscribers are notified synchronously when focus changes.
 */

export type TerminalFocusState = 'focused' | 'blurred' | 'unknown'

let focusState: TerminalFocusState = 'unknown'
const subscribers = new Set<() => void>()

export function setTerminalFocused(focused: boolean): void {
  focusState = focused ? 'focused' : 'blurred'
  for (const cb of subscribers) cb()
}

export function getTerminalFocused(): boolean {
  return focusState !== 'blurred'
}

export function getTerminalFocusState(): TerminalFocusState {
  return focusState
}

/** Subscribe for useSyncExternalStore */
export function subscribeTerminalFocus(cb: () => void): () => void {
  subscribers.add(cb)
  return () => { subscribers.delete(cb) }
}

export function resetTerminalFocusState(): void {
  focusState = 'unknown'
  for (const cb of subscribers) cb()
}
