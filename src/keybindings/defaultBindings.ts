import type { KeybindingBlock } from './types'

// Windows VT (Virtual Terminal) mode detection.
// On Windows without VT processing enabled, Shift+Tab may not be reliably
// transmitted. We detect this by checking for the ENABLE_VIRTUAL_TERMINAL_PROCESSING
// flag. Absent a native API call, we use a conservative heuristic:
// - CI environments always have VT (they typically run with VT support)
// - WT_SESSION (Windows Terminal) has VT support
// - ConEmu/ANSICON-flagged environments have VT support
// - Otherwise assume no VT on Windows
function isWindowsVtModeEnabled(): boolean {
  if (process.platform !== 'win32') return true
  // Windows Terminal sets WT_SESSION
  if (process.env['WT_SESSION']) return true
  // ConEmu
  if (process.env['ConEmuANSI'] === 'ON') return true
  // ANSICON
  if (process.env['ANSICON']) return true
  // CI often supports VT
  if (process.env['CI']) return true
  // VS Code integrated terminal
  if (process.env['TERM_PROGRAM'] === 'vscode') return false
  // Default: assume limited VT support on raw Windows console
  return false
}

const IS_WINDOWS = process.platform === 'win32'
const HAS_VT = isWindowsVtModeEnabled()

// On Windows without VT mode, Shift+Tab is not reliably transmitted.
// Fall back to meta+m (Alt+M) which is easier to type on Windows CMD.
// This matches the pattern in PromptInput.tsx: `(key.shift && key.tab) || (key.meta && input === 'm')`
const MODE_CYCLE_KEY = IS_WINDOWS && !HAS_VT ? 'alt+m' : 'shift+tab'

/**
 * QiLing default keybindings.
 *
 * Ported from CC's defaultBindings.ts. Feature flags replaced with
 * environment variable checks or compile-time constants.
 *
 * Binding semantics: last-wins within same context (user overrides append).
 */
export const DEFAULT_BINDINGS: KeybindingBlock[] = [
  {
    context: 'Global',
    bindings: {
      // Application control
      'ctrl+c': 'app:interrupt',
      'ctrl+d': 'app:quit',
    },
  },
  {
    context: 'Chat',
    bindings: {
      // Submit the current message
      'enter': 'chat:submit',

      // Cycle permission mode (Shift+Tab, or alt+m on Windows without VT)
      [MODE_CYCLE_KEY]: 'chat:cycleMode',

      // Cancel / clear
      'escape': 'chat:cancel',

      // History navigation
      'up': 'history:previous',
      'down': 'history:next',

      // Cursor movement
      'left': 'cursor:left',
      'right': 'cursor:right',
      'ctrl+a': 'cursor:lineStart',
      'ctrl+e': 'cursor:lineEnd',
      'alt+left': 'cursor:wordLeft',
      'alt+right': 'cursor:wordRight',
      'ctrl+left': 'cursor:wordLeft',
      'ctrl+right': 'cursor:wordRight',

      // Editing
      'backspace': 'edit:backspace',
      'delete': 'edit:delete',
      'ctrl+k': 'edit:deleteToEnd',
      'ctrl+u': 'edit:deleteToStart',
      'ctrl+w': 'edit:deleteWordBack',

      // Newline in multi-line input (only when modifier is held)
      'shift+enter': 'chat:newline',
      'ctrl+j': 'chat:newline',
    },
  },
  {
    context: 'Autocomplete',
    bindings: {
      // Navigate autocomplete list
      'up': 'autocomplete:previous',
      'down': 'autocomplete:next',
      // Accept selected item
      'enter': 'autocomplete:accept',
      'tab': 'autocomplete:accept',
      // Dismiss
      'escape': 'autocomplete:dismiss',
    },
  },
  {
    context: 'Confirmation',
    bindings: {
      // Yes/No/Always/Deny shortcuts
      'y': 'confirm:yes',
      'n': 'confirm:no',
      'a': 'confirm:always',
      'd': 'confirm:deny',
      'enter': 'confirm:yes',
      'escape': 'confirm:no',
    },
  },
  {
    context: 'HistorySearch',
    bindings: {
      // Incremental history search (ctrl+r style)
      'ctrl+r': 'history:searchNext',
      'ctrl+s': 'history:searchPrev',
      'enter': 'history:searchAccept',
      'escape': 'history:searchCancel',
      'ctrl+g': 'history:searchCancel',
    },
  },
  {
    context: 'Scroll',
    bindings: {
      // Scroll output
      'pageup': 'scroll:pageUp',
      'pagedown': 'scroll:pageDown',
      'up': 'scroll:lineUp',
      'down': 'scroll:lineDown',
      'ctrl+home': 'scroll:top',
      'ctrl+end': 'scroll:bottom',
      'escape': 'scroll:exit',
    },
  },
  {
    context: 'Select',
    bindings: {
      'up': 'select:previous',
      'down': 'select:next',
      'enter': 'select:confirm',
      'space': 'select:toggle',
      'escape': 'select:cancel',
    },
  },
  {
    context: 'Help',
    bindings: {
      'escape': 'help:close',
      'q': 'help:close',
      'up': 'help:scrollUp',
      'down': 'help:scrollDown',
    },
  },
  {
    context: 'ModelPicker',
    bindings: {
      'up': 'modelPicker:previous',
      'down': 'modelPicker:next',
      'enter': 'modelPicker:select',
      'escape': 'modelPicker:cancel',
    },
  },
  {
    context: 'ThemePicker',
    bindings: {
      'up': 'themePicker:previous',
      'down': 'themePicker:next',
      'enter': 'themePicker:select',
      'escape': 'themePicker:cancel',
    },
  },
  {
    context: 'MessageSelector',
    bindings: {
      'up': 'messageSelector:previous',
      'down': 'messageSelector:next',
      'enter': 'messageSelector:select',
      'escape': 'messageSelector:cancel',
      'y': 'messageSelector:confirm',
      'n': 'messageSelector:cancel',
    },
  },
  {
    context: 'DiffDialog',
    bindings: {
      'escape': 'diffDialog:close',
      'y': 'diffDialog:accept',
      'n': 'diffDialog:reject',
      'a': 'diffDialog:acceptAll',
      'd': 'diffDialog:rejectAll',
    },
  },
  {
    context: 'Transcript',
    bindings: {
      'up': 'transcript:scrollUp',
      'down': 'transcript:scrollDown',
      'pageup': 'transcript:pageUp',
      'pagedown': 'transcript:pageDown',
      'escape': 'transcript:exit',
    },
  },
]
