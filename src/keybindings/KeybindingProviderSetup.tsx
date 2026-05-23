/**
 * KeybindingProviderSetup — adapted from CC's keybindings/KeybindingProviderSetup.tsx
 *
 * Async loader component that:
 * 1. Calls loadUserBindings() on mount
 * 2. Provides the merged KeybindingBlock[] via KeybindingProvider
 * 3. Renders children immediately with defaults; silently upgrades when
 *    the user file is loaded (no flash / loading spinner).
 *
 * Errors from the user file (invalid JSON, read failure) are logged to
 * stderr but do not block rendering.
 */

import React, { useEffect, useState } from 'react'
import { KeybindingProvider } from './KeybindingContext.js'
import { loadUserBindings } from './loadUserBindings.js'
import { DEFAULT_BINDINGS } from './defaultBindings.js'
import type { KeybindingBlock } from './types.js'

type Props = { children: React.ReactNode }

type BindingState = {
  blocks: KeybindingBlock[]
  customLoaded: boolean
}

export function KeybindingProviderSetup({ children }: Props): React.ReactNode {
  const [state, setState] = useState<BindingState>({
    blocks: DEFAULT_BINDINGS,
    customLoaded: false,
  })

  useEffect(() => {
    loadUserBindings().then(({ blocks, customLoaded, error }) => {
      if (error) {
        process.stderr.write(`[keybindings] ${error}\n`)
      }
      setState({ blocks, customLoaded })
    }).catch((err: unknown) => {
      process.stderr.write(`[keybindings] Unexpected error: ${String(err)}\n`)
    })
  }, [])

  return (
    <KeybindingProvider blocks={state.blocks} customLoaded={state.customLoaded}>
      {children}
    </KeybindingProvider>
  )
}
