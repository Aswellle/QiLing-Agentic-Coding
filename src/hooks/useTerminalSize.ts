/**
 * Terminal size hook — adapted from CC's hooks/useTerminalSize.ts
 *
 * Returns current terminal dimensions, updated on SIGWINCH.
 */

import { useEffect, useState } from 'react'

export type TerminalSize = { rows: number; columns: number }

function getSize(): TerminalSize {
  return {
    rows: process.stdout.rows ?? 24,
    columns: process.stdout.columns ?? 80,
  }
}

export function useTerminalSize(): TerminalSize {
  const [size, setSize] = useState<TerminalSize>(getSize)

  useEffect(() => {
    const handler = () => setSize(getSize())
    process.stdout.on('resize', handler)
    return () => { process.stdout.off('resize', handler) }
  }, [])

  return size
}
