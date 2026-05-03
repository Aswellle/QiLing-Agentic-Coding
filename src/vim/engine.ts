/**
 * Re-exports from the full CC vim stack for backwards compat.
 * PromptInput now uses transitions.ts + Cursor directly.
 */
export { transition } from './transitions'
export type { TransitionContext, TransitionResult } from './transitions'
export { createInitialVimState, createInitialPersistentState } from './types'
export type { VimState, PersistentState, CommandState, VimMode } from './types'
