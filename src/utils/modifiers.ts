/**
 * Modifier key detection — adapted from CC's utils/modifiers.ts
 *
 * Uses modifiers-napi native module on macOS to detect real-time modifier
 * key state. Returns false on non-macOS or when the native module is absent.
 *
 * Primary use: detect Shift/Command/Option held during mouse clicks in the TUI.
 */

export type ModifierKey = 'shift' | 'command' | 'control' | 'option'

let prewarmed = false

/**
 * Pre-warm the native module by loading it in advance.
 * Call this early (e.g., at startup) to avoid latency on first use.
 * No-op on non-macOS or when modifiers-napi is not installed.
 */
export function prewarmModifiers(): void {
  if (prewarmed || process.platform !== 'darwin') return
  prewarmed = true
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { prewarm } = require('modifiers-napi') as { prewarm: () => void }
    prewarm()
  } catch { /* modifiers-napi not installed — ignore */ }
}

/**
 * Check if a specific modifier key is currently pressed.
 * Always returns false on non-macOS or when modifiers-napi is not installed.
 */
export function isModifierPressed(modifier: ModifierKey): boolean {
  if (process.platform !== 'darwin') return false
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isModifierPressed: native } =
      require('modifiers-napi') as { isModifierPressed: (m: string) => boolean }
    return native(modifier)
  } catch {
    return false
  }
}
