/**
 * Keybinding React hooks — adapted from CC's keybindings/useKeybinding.ts
 *
 * useKeybinding: register a handler for a single named action.
 * useKeybindings: register handlers for multiple actions at once.
 * Both integrate with QiLing's keybinding resolver and chord system.
 */

import { useCallback, useRef } from 'react'
import { useInput } from 'ink'
import type { Key } from 'ink'
import { loadKeybindingsSync } from './loader.js'
import { resolveKey } from './resolver.js'
import type { KeybindingContextName } from './types.js'

type Options = {
  context?: KeybindingContextName
  isActive?: boolean
}

/**
 * Resolves a key event to an action name using loaded bindings.
 * Returns null if unbound or no match.
 */
function resolveToAction(input: string, key: Key, contexts: KeybindingContextName[]): string | null {
  const bindings = loadKeybindingsSync()
  const result = resolveKey(input, key, contexts, bindings)
  if (result && typeof result === 'string') return result
  return null
}

/**
 * Register a handler for a single named action.
 *
 * @example
 * useKeybinding('app:toggleTodos', () => setShowTodos(p => !p))
 */
export function useKeybinding(
  action: string,
  handler: () => void | false | Promise<void>,
  options: Options = {},
): void {
  const { context = 'Global', isActive = true } = options
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useInput(
    useCallback(
      (input, key) => {
        const contexts: KeybindingContextName[] = context !== 'Global' ? [context, 'Global'] : ['Global']
        const resolved = resolveToAction(input, key, contexts)
        if (resolved === action) {
          handlerRef.current()
        }
      },
      [action, context],
    ),
    { isActive },
  )
}

/**
 * Register handlers for multiple actions at once (reduces useInput calls).
 *
 * @example
 * useKeybindings({ 'chat:submit': () => submit(), 'chat:cancel': () => cancel() })
 */
export function useKeybindings(
  handlers: Record<string, () => void | false | Promise<void>>,
  options: Options = {},
): void {
  const { context = 'Global', isActive = true } = options
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useInput(
    useCallback(
      (input, key) => {
        const contexts: KeybindingContextName[] = context !== 'Global' ? [context, 'Global'] : ['Global']
        const resolved = resolveToAction(input, key, contexts)
        if (resolved && resolved in handlersRef.current) {
          handlersRef.current[resolved]?.()
        }
      },
      [context],
    ),
    { isActive },
  )
}
