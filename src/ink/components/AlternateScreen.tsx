/**
 * AlternateScreen — adapted from CC's ink/components/AlternateScreen.tsx
 *
 * Mounts children in the terminal's alternate screen buffer (DEC 1049),
 * constrained to the viewport height. On unmount, restores the main screen.
 *
 * While mounted:
 *   - Enters alt screen (ESC[?1049h), clears it (ESC[2J), homes cursor
 *   - Optionally enables SGR mouse tracking (wheel + click/drag)
 *   - Children must handle overflow via `overflowY: scroll` / flexbox
 *
 * Use for fullscreen overlays (transcript view, ctrl+o expand) where the
 * main screen content must be preserved for restore on exit.
 *
 * QiLing adaptation: omits the ink-internal `instances` map (which calls
 * setAltScreenActive / clearTextSelection) since QiLing uses the npm ink
 * package and doesn't have access to those internal methods. The screen
 * enter/exit sequences are still written via TerminalWriteContext.
 */

import React, { type PropsWithChildren, useContext, useInsertionEffect } from 'react'
import { Box } from 'ink'
import {
  DISABLE_MOUSE_TRACKING,
  ENABLE_MOUSE_TRACKING,
  ENTER_ALT_SCREEN,
  EXIT_ALT_SCREEN,
} from '../termio/dec.js'
import { TerminalWriteContext } from '../useTerminalNotification.js'
import { TerminalSizeContext } from './TerminalSizeContext.js'

type Props = PropsWithChildren<{
  /** Enable SGR mouse tracking (wheel + click/drag). Default true. */
  mouseTracking?: boolean
}>

/**
 * useInsertionEffect instead of useLayoutEffect so the alt-screen sequence
 * reaches the terminal before the first Ink render frame is written.
 * (Ink calls resetAfterCommit between mutation and layout phases; using
 * useLayoutEffect would let a full frame render to the main screen first.)
 */
export function AlternateScreen({
  children,
  mouseTracking = true,
}: Props): React.ReactNode {
  const size = useContext(TerminalSizeContext)
  const writeRaw = useContext(TerminalWriteContext)

  useInsertionEffect(() => {
    if (!writeRaw) return

    // Enter alt screen, clear it, home the cursor, then optionally enable mouse
    writeRaw(
      ENTER_ALT_SCREEN +
        '\x1b[2J\x1b[H' +
        (mouseTracking ? ENABLE_MOUSE_TRACKING : ''),
    )

    return () => {
      // Disable mouse tracking first, then exit alt screen
      writeRaw((mouseTracking ? DISABLE_MOUSE_TRACKING : '') + EXIT_ALT_SCREEN)
    }
  }, [writeRaw, mouseTracking])

  return (
    <Box
      flexDirection="column"
      height={size?.rows ?? process.stdout.rows ?? 24}
      overflow="hidden"
    >
      {children}
    </Box>
  )
}
