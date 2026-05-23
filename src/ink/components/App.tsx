/**
 * App — adapted from CC's ink/components/App.tsx
 *
 * Root Ink component rendered by ink.tsx. Mounts all global context
 * providers and renders the user's element tree inside them.
 *
 * Provider order (outermost → innermost):
 *   OverlayProvider → VoiceProvider → AppStateProvider → children
 *
 * Error boundary: catches React render errors and shows ErrorOverview.
 *
 * QiLing adaptation:
 * - Omits CC's Bridge / Swarm / Tungsten providers (Phase D)
 * - Uses QiLing's AppStateProvider from state/AppState.tsx
 * - ErrorBoundary delegates to ink/components/ErrorOverview
 */

import React from 'react'
import { Box } from 'ink'
import { AppStateProvider } from '../../state/AppState.js'
import { OverlayProvider } from '../../context/overlayContext.js'
import { VoiceProvider } from '../../context/voice.js'
import ErrorOverview from './ErrorOverview.js'
import type { AppState } from '../../state/AppStateStore.js'

// ─── Error Boundary ───────────────────────────────────────────────────────────

type ErrorBoundaryState = { error: Error | null }

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  override render(): React.ReactNode {
    if (this.state.error) {
      return (
        <Box flexDirection="column" padding={1}>
          <ErrorOverview error={this.state.error} />
        </Box>
      )
    }
    return this.props.children
  }
}

// ─── App ─────────────────────────────────────────────────────────────────────

type Props = {
  children: React.ReactNode
  /** Initial AppState slice (forwarded to AppStateProvider) */
  initialState?: Partial<AppState>
}

export default function App({ children, initialState }: Props): React.ReactNode {
  return (
    <AppErrorBoundary>
      <AppStateProvider initialState={initialState}>
        <OverlayProvider>
          <VoiceProvider>
            {children}
          </VoiceProvider>
        </OverlayProvider>
      </AppStateProvider>
    </AppErrorBoundary>
  )
}
