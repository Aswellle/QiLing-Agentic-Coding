/**
 * Dialog — adapted from CC's components/design-system/Dialog.tsx
 *
 * Confirm/cancel dialog with title, subtitle, Esc-to-cancel keybinding,
 * and Enter/Esc input guide. Used for permission dialogs and settings.
 * Pass hideBorder=true to embed inside a Pane without double-framing.
 */

import React from 'react'
import { Box, Text } from 'ink'
import {
  type ExitState,
  useExitOnCtrlCDWithKeybindings,
} from '../../hooks/useExitOnCtrlCDWithKeybindings.js'
import { useKeybinding } from '../../keybindings/useKeybinding.js'
import type { Theme } from '../../utils/theme.js'
import { ConfigurableShortcutHint } from '../ConfigurableShortcutHint.js'
import { Byline } from './Byline.js'
import { KeyboardShortcutHint } from './KeyboardShortcutHint.js'
import { Pane } from './Pane.js'

type DialogProps = {
  title: React.ReactNode
  subtitle?: React.ReactNode
  children: React.ReactNode
  onCancel: () => void
  color?: keyof Theme
  hideInputGuide?: boolean
  hideBorder?: boolean
  inputGuide?: (exitState: ExitState) => React.ReactNode
  isCancelActive?: boolean
}

export function Dialog({
  title,
  subtitle,
  children,
  onCancel,
  color = 'permission',
  hideInputGuide,
  hideBorder,
  inputGuide,
  isCancelActive = true,
}: DialogProps): React.ReactNode {
  const exitState = useExitOnCtrlCDWithKeybindings(undefined, undefined, isCancelActive)

  useKeybinding('confirm:no', onCancel, { context: 'Confirmation', isActive: isCancelActive })

  const defaultInputGuide = exitState.pending ? (
    <Text>Press {exitState.keyName} again to exit</Text>
  ) : (
    <Byline>
      <KeyboardShortcutHint shortcut="Enter" action="confirm" />
      <ConfigurableShortcutHint action="confirm:no" context="Confirmation" fallback="Esc" description="cancel" />
    </Byline>
  )

  const content = (
    <>
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text bold color={color}>{title}</Text>
          {subtitle && <Text dimColor>{subtitle}</Text>}
        </Box>
        {children}
      </Box>
      {!hideInputGuide && (
        <Box marginTop={1}>
          <Text dimColor italic>
            {inputGuide ? inputGuide(exitState) : defaultInputGuide}
          </Text>
        </Box>
      )}
    </>
  )

  if (hideBorder) return content
  return <Pane color={color}>{content}</Pane>
}
