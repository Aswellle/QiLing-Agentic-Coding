/**
 * Memory update notification — adapted from CC's components/memory/MemoryUpdateNotification.tsx
 *
 * Shows when auto-memory has written or updated a memory file.
 */

import { homedir } from 'node:os'
import { relative } from 'node:path'
import React from 'react'
import { Box, Text } from 'ink'
import { getCwd } from '../../utils/cwd.js'

export function getRelativeMemoryPath(path: string): string {
  const homeDir = homedir()
  const cwd = getCwd()

  const relativeToHome = path.startsWith(homeDir) ? '~' + path.slice(homeDir.length) : null
  const relativeToCwd = path.startsWith(cwd) ? './' + relative(cwd, path) : null

  if (relativeToHome && relativeToCwd) {
    return relativeToHome.length <= relativeToCwd.length ? relativeToHome : relativeToCwd
  }
  return relativeToHome ?? relativeToCwd ?? path
}

export function MemoryUpdateNotification({
  memoryPath,
}: {
  memoryPath: string
}): React.ReactNode {
  const displayPath = getRelativeMemoryPath(memoryPath)
  return (
    <Box flexDirection="column" flexGrow={1}>
      <Text color="cyan">
        记忆已更新 {displayPath} · /memory 编辑
      </Text>
    </Box>
  )
}
