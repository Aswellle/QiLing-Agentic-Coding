/**
 * Interrupted-by-user indicator — adapted from CC's components/InterruptedByUser.tsx
 */

import React from 'react'
import { Text } from 'ink'

export function InterruptedByUser(): React.ReactNode {
  return (
    <>
      <Text dimColor>Interrupted </Text>
      <Text dimColor>· 接下来想做什么?</Text>
    </>
  )
}
