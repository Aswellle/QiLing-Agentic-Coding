/**
 * Pane — adapted from CC's components/design-system/Pane.tsx
 *
 * A region that appears below the REPL prompt, bounded by a colored top line
 * with a one-row gap above and horizontal padding. Used by all slash-command
 * screens: /config, /help, /plugins, /stats, /permissions.
 *
 * For confirm/cancel dialogs use `<Dialog>`. For a rounded card use `<Panel>`.
 * When inside a FullscreenLayout modal slot, skips its own Divider to avoid
 * double-framing.
 */

import React from 'react'
import { Box } from 'ink'
import { useIsInsideModal } from '../../context/modalContext.js'
import { Divider } from './Divider.js'
import type { Theme } from '../../utils/theme.js'

type PaneProps = {
  children: React.ReactNode
  /** Theme color for the top border line */
  color?: keyof Theme
}

export function Pane({ children, color }: PaneProps): React.ReactNode {
  if (useIsInsideModal()) {
    return (
      <Box flexDirection="column" paddingX={1} flexShrink={0}>
        {children}
      </Box>
    )
  }
  return (
    <Box flexDirection="column" paddingTop={1}>
      <Divider color={color} />
      <Box flexDirection="column" paddingX={2}>
        {children}
      </Box>
    </Box>
  )
}
