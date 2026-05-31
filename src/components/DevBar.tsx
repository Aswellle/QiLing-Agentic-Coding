import * as React from 'react'
import { useState, useEffect, useRef } from 'react'
import { getSlowOperations } from '../bootstrap/state.js'
import { Text } from 'ink'

// Inline useInterval (usehooks-ts not installed)
function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback)
  savedCallback.current = callback
  useEffect(() => {
    if (delay === null) return
    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}

// Show DevBar for dev builds only — always false in production
function shouldShowDevBar(): boolean {
  return false
}

export function DevBar(): React.ReactNode {
  const [slowOps, setSlowOps] = useState(getSlowOperations)

  useInterval(
    () => { setSlowOps(getSlowOperations()) },
    shouldShowDevBar() ? 500 : null,
  )

  if (!shouldShowDevBar() || slowOps.length === 0) {
    return null
  }

  const recentOps = slowOps
    .slice(-3)
    .map(op => `${op.operation} (${Math.round(op.durationMs)}ms)`)
    .join(' · ')

  return (
    <Text wrap="truncate-end" color="warning">
      [DEV] slow sync: {recentOps}
    </Text>
  )
}
