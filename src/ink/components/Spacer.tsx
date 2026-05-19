/**
 * Spacer component — adapted from CC's ink/components/Spacer.tsx
 * Fills remaining space in a flex container along the major axis.
 */

import React from 'react'
import { Box } from 'ink'

export default function Spacer() {
  return <Box flexGrow={1} />
}
