/**
 * Raw ANSI passthrough component — adapted from CC's ink/components/RawAnsi.tsx
 *
 * Bypasses the Ansi → React tree → Yoga → re-serialize roundtrip for content
 * that is already terminal-ready (e.g. syntax-highlighted diff output from NAPI).
 * Emits a single Yoga leaf with constant-time measurement.
 */

import React from 'react'
import { Text } from 'ink'

type Props = {
  /** Pre-rendered ANSI lines, one per terminal row (already wrapped to width) */
  lines: string[]
  /** Column width the producer wrapped to */
  width: number
}

export function RawAnsi({ lines, width }: Props): React.ReactNode {
  if (lines.length === 0) return null
  // In QiLing we fall back to a simple Text render since ink-raw-ansi is CC-internal
  return <Text>{lines.join('\n')}</Text>
}
