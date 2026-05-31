import { type AppState } from '../state/AppStateStore.js'
import { useAppState } from '../state/AppState.js'

export type ReadonlySettings = AppState['settings']

/**
 * React hook to access current settings from AppState.
 * Settings automatically update when files change on disk via settingsChangeDetector.
 */
export function useSettings(): ReadonlySettings {
  return useAppState(s => s.settings)
}
