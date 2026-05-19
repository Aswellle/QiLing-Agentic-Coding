/**
 * Settings change hook — adapted from CC's hooks/useSettingsChange.ts
 *
 * Subscribes to settings file changes and calls the provided callback.
 * Useful for components that need to react to live settings updates
 * (e.g., theme changes, permission updates).
 */

import { useCallback, useEffect } from 'react'

type SettingsChangeCallback = () => void

// Simple event emitter for settings changes
let _listeners: Set<SettingsChangeCallback> = new Set()

/** Notify all settings change subscribers. Call after saving settings. */
export function notifySettingsChange(): void {
  for (const listener of _listeners) {
    try {
      listener()
    } catch { /* ignore listener errors */ }
  }
}

/**
 * Subscribe to settings changes.
 * The callback is called whenever settings are saved or reloaded.
 */
export function useSettingsChange(onChange: SettingsChangeCallback): void {
  const stable = useCallback(onChange, [onChange])

  useEffect(() => {
    _listeners.add(stable)
    return () => {
      _listeners.delete(stable)
    }
  }, [stable])
}
