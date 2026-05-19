/**
 * Ctrl+C/D exit handler — adapted from CC's hooks/useExitOnCtrlCD.ts
 *
 * Double-press mechanism: first press shows "Press X again to exit",
 * second press within 800ms exits. These keys cannot be rebound.
 * `onInterrupt` callback lets features handle Ctrl+C (return true to consume).
 */

import { useCallback, useMemo, useState } from 'react'
import { useApp } from 'ink'
import type { KeybindingContextName } from '../keybindings/types.js'
import { useDoublePress } from './useDoublePress.js'

export type ExitState = {
  pending: boolean
  keyName: 'Ctrl-C' | 'Ctrl-D' | null
}

type KeybindingOptions = {
  context?: KeybindingContextName
  isActive?: boolean
}

type UseKeybindingsHook = (
  handlers: Record<string, () => void>,
  options?: KeybindingOptions,
) => void

export function useExitOnCtrlCD(
  useKeybindingsHook: UseKeybindingsHook,
  onInterrupt?: () => boolean,
  onExit?: () => void,
  isActive = true,
): ExitState {
  const { exit } = useApp()
  const [exitState, setExitState] = useState<ExitState>({ pending: false, keyName: null })

  const exitFn = useMemo(() => onExit ?? exit, [onExit, exit])

  const handleCtrlCDoublePress = useDoublePress(
    pending => setExitState({ pending, keyName: 'Ctrl-C' }),
    exitFn,
  )

  const handleCtrlDDoublePress = useDoublePress(
    pending => setExitState({ pending, keyName: 'Ctrl-D' }),
    exitFn,
  )

  const handleInterrupt = useCallback(() => {
    if (onInterrupt?.()) return
    handleCtrlCDoublePress()
  }, [handleCtrlCDoublePress, onInterrupt])

  const handleExit = useCallback(() => {
    handleCtrlDDoublePress()
  }, [handleCtrlDDoublePress])

  const handlers = useMemo(
    () => ({ 'app:interrupt': handleInterrupt, 'app:exit': handleExit }),
    [handleInterrupt, handleExit],
  )

  useKeybindingsHook(handlers, { isActive })

  return exitState
}
