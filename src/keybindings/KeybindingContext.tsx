/**
 * KeybindingContext — adapted from CC's keybindings/KeybindingContext.tsx
 *
 * React context that distributes the current keybinding blocks to the
 * component tree. Components call useKeybindings() to look up bound
 * key sequences for a given context + action.
 */

import React, { createContext, useContext } from 'react'
import type { KeybindingBlock, KeybindingContextName } from './types.js'

// ─── Context ──────────────────────────────────────────────────────────────────

type KeybindingContextValue = {
  blocks: KeybindingBlock[]
  /** True when user's custom keybindings.json has been loaded. */
  customLoaded: boolean
}

const KeybindingContext = createContext<KeybindingContextValue>({
  blocks: [],
  customLoaded: false,
})

// ─── Provider ─────────────────────────────────────────────────────────────────

type Props = {
  blocks: KeybindingBlock[]
  customLoaded?: boolean
  children: React.ReactNode
}

export function KeybindingProvider({ blocks, customLoaded = false, children }: Props): React.ReactNode {
  const value = React.useMemo(
    () => ({ blocks, customLoaded }),
    [blocks, customLoaded],
  )
  return (
    <KeybindingContext.Provider value={value}>
      {children}
    </KeybindingContext.Provider>
  )
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Get all keybinding blocks. */
export function useKeybindingBlocks(): KeybindingBlock[] {
  return useContext(KeybindingContext).blocks
}

/**
 * Get the key string bound to an action in a specific context.
 * Returns null if the action is unbound.
 */
export function useKeybinding(context: KeybindingContextName, action: string): string | null {
  const blocks = useKeybindingBlocks()
  for (const block of blocks) {
    if (block.context === context && action in block.bindings) {
      return block.bindings[action] ?? null
    }
  }
  return null
}

/** Get all bindings for a given context as a flat action→key map. */
export function useContextBindings(context: KeybindingContextName): Record<string, string | null> {
  const blocks = useKeybindingBlocks()
  const result: Record<string, string | null> = {}
  for (const block of blocks) {
    if (block.context === context) {
      Object.assign(result, block.bindings)
    }
  }
  return result
}

/** True if custom bindings have been loaded from the user's config. */
export function useCustomBindingsLoaded(): boolean {
  return useContext(KeybindingContext).customLoaded
}
