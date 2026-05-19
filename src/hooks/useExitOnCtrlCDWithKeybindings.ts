/**
 * useExitOnCtrlCDWithKeybindings — adapted from CC's hooks/useExitOnCtrlCDWithKeybindings.ts
 *
 * Wires useExitOnCtrlCD with QiLing's useKeybindings hook.
 * Separated to avoid import cycles between keybindings and hook modules.
 */

import { useKeybindings } from '../keybindings/useKeybinding.js'
import { type ExitState, useExitOnCtrlCD } from './useExitOnCtrlCD.js'

export type { ExitState }

export function useExitOnCtrlCDWithKeybindings(
  onExit?: () => void,
  onInterrupt?: () => boolean,
  isActive?: boolean,
): ExitState {
  return useExitOnCtrlCD(useKeybindings, onInterrupt, onExit, isActive)
}
