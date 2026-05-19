/**
 * Press Enter to continue prompt — adapted from CC's components/PressEnterToContinue.tsx
 */

import React from 'react'
import { Text } from 'ink'

export function PressEnterToContinue(): React.ReactNode {
  return (
    <Text color="cyan">
      按 <Text bold>Enter</Text> 继续…
    </Text>
  )
}
