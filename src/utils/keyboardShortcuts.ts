/**
 * macOS Option+key special character mapping — direct port of CC's utils/keyboardShortcuts.ts
 *
 * On macOS, when "Option as Meta" is NOT enabled in the terminal, pressing
 * Option+T produces '†' instead of the Alt+T keybinding. This mapping
 * converts these special characters back to their keybinding equivalents.
 *
 * Used by keybinding handlers to detect Option+key shortcuts on macOS
 * terminals like Terminal.app and iTerm2 (without Meta key configured).
 */

export const MACOS_OPTION_SPECIAL_CHARS = {
  '†': 'alt+t',   // Option+T → thinking toggle
  'π': 'alt+p',   // Option+P → model picker
  'ø': 'alt+o',   // Option+O → fast mode
} as const satisfies Record<string, string>

export function isMacosOptionChar(
  char: string,
): char is keyof typeof MACOS_OPTION_SPECIAL_CHARS {
  return char in MACOS_OPTION_SPECIAL_CHARS
}
