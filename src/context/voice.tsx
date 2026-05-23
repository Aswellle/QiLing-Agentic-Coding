/**
 * Voice state context — adapted from CC's context/voice.tsx
 *
 * Provides voice recording/processing state to the component tree.
 * Uses the same Store pattern as AppState for consistency.
 *
 * Phase D: wire to an actual voice recognition backend (CC uses Web Speech
 * API or Whisper). This file establishes the state shape and hooks so the
 * UI can render voice UI without a backend dependency.
 */

import React, { createContext, useContext, useState, useSyncExternalStore } from 'react'
import { createStore, type Store } from '../state/store.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export type VoiceState = {
  voiceState: 'idle' | 'recording' | 'processing'
  voiceError: string | null
  voiceInterimTranscript: string
  voiceAudioLevels: number[]
  voiceWarmingUp: boolean
}

const DEFAULT_STATE: VoiceState = {
  voiceState: 'idle',
  voiceError: null,
  voiceInterimTranscript: '',
  voiceAudioLevels: [],
  voiceWarmingUp: false,
}

// ─── Store & Context ──────────────────────────────────────────────────────────

type VoiceStore = Store<VoiceState>

const VoiceContext = createContext<VoiceStore | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

type Props = { children: React.ReactNode }

export function VoiceProvider({ children }: Props): React.ReactNode {
  const [store] = useState(() => createStore<VoiceState>(DEFAULT_STATE))
  return (
    <VoiceContext.Provider value={store}>
      {children}
    </VoiceContext.Provider>
  )
}

// ─── Internal hook ────────────────────────────────────────────────────────────

function useVoiceStore(): VoiceStore {
  const store = useContext(VoiceContext)
  if (!store) throw new Error('useVoiceState must be used within a VoiceProvider')
  return store
}

// ─── Public hooks ─────────────────────────────────────────────────────────────

/**
 * Subscribe to a slice of voice state. Only re-renders when the selected
 * value changes (compared via Object.is).
 */
export function useVoiceState<T>(selector: (state: VoiceState) => T): T {
  const store = useVoiceStore()
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(DEFAULT_STATE),
  )
}

/**
 * Get the voice state setter. Stable reference — never causes re-renders.
 */
export function useSetVoiceState(): (updater: Partial<VoiceState> | ((prev: VoiceState) => VoiceState)) => void {
  const store = useVoiceStore()
  return (updater) => {
    if (typeof updater === 'function') {
      store.setState(updater)
    } else {
      store.setState((prev) => ({ ...prev, ...updater }))
    }
  }
}

/** Convenience: get the full voice state snapshot. */
export function useVoiceSnapshot(): VoiceState {
  return useVoiceState((s) => s)
}
