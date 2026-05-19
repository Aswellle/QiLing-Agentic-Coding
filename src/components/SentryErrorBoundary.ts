/**
 * Error boundary component — adapted from CC's components/SentryErrorBoundary.ts
 *
 * Catches React render errors and renders null instead of crashing.
 * In CC this also reports to Sentry; in QiLing it just silently recovers.
 */

import React from 'react'

interface Props { children: React.ReactNode }
interface State { hasError: boolean }

export class SentryErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render(): React.ReactNode {
    if (this.state.hasError) return null
    return this.props.children
  }
}
