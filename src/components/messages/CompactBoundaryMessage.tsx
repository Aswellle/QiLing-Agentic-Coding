/**
 * Compact boundary marker — adapted from CC's components/messages/CompactBoundaryMessage.tsx
 *
 * Shows when conversation has been compacted, with hint to expand history.
 */

import React from 'react'
import { Box, Text } from 'ink'
import { useShortcutDisplay } from '../../keybindings/useShortcutDisplay.js'

export function CompactBoundaryMessage(): React.ReactNode {
  const historyShortcut = useShortcutDisplay('app:toggleTranscript', 'Global', 'ctrl+o')

  return (
    <Box marginY={1}>
      <Text dimColor>
        ✻ 对话已压缩 ({historyShortcut} 查看历史)
      </Text>
    </Box>
  )
}
