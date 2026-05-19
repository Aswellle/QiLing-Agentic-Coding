/**
 * Prompt input stash notice — adapted from CC's components/PromptInput/PromptInputStashNotice.tsx
 *
 * Shows when the user has stashed content in the prompt input (e.g., when switching
 * to a different context). Stash auto-restores after the next submit.
 */

import figures from 'figures'
import React from 'react'
import { Box, Text } from 'ink'

type Props = {
  hasStash: boolean
}

export function PromptInputStashNotice({ hasStash }: Props): React.ReactNode {
  if (!hasStash) return null

  return (
    <Box paddingLeft={2}>
      <Text dimColor>
        {figures.pointerSmall} 已暂存 (提交后自动恢复)
      </Text>
    </Box>
  )
}
