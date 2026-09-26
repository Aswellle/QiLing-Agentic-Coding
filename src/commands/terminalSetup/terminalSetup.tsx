/**
 * Terminal setup helpers — partial port of CC's commands/terminalSetup/terminalSetup.tsx
 *
 * Only the global-config flag helpers are ported for now; the interactive
 * Shift+Enter keybinding installer (the `call` command body and its
 * terminal-specific installers) is deferred until the terminalSetup command
 * batch lands. useTextInput depends on markBackslashReturnUsed().
 */

import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'

// FROM CC: isShiftEnterKeyBindingInstalled
export function isShiftEnterKeyBindingInstalled(): boolean {
  return getGlobalConfig().shiftEnterKeyBindingInstalled === true
}

// FROM CC: hasUsedBackslashReturn
export function hasUsedBackslashReturn(): boolean {
  return getGlobalConfig().hasUsedBackslashReturn === true
}

// FROM CC: markBackslashReturnUsed
export function markBackslashReturnUsed(): void {
  const config = getGlobalConfig()
  if (!config.hasUsedBackslashReturn) {
    saveGlobalConfig(current => ({
      ...current,
      hasUsedBackslashReturn: true,
    }))
  }
}
