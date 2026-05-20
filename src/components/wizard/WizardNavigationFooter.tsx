/**
 * WizardNavigationFooter — adapted from CC's components/wizard/WizardNavigationFooter.tsx
 *
 * Shows navigation hints (↑↓ navigate, Enter select, Esc go back) below a wizard step.
 * Pending exit shows "Press X again to exit" instead.
 */

import React, { type ReactNode } from 'react'
import { Box, Text } from 'ink'
import { useExitOnCtrlCDWithKeybindings } from '../../hooks/useExitOnCtrlCDWithKeybindings.js'
import { ConfigurableShortcutHint } from '../ConfigurableShortcutHint.js'
import { Byline } from '../design-system/Byline.js'
import { KeyboardShortcutHint } from '../design-system/KeyboardShortcutHint.js'

type Props = { instructions?: ReactNode }

const defaultInstructions = (
  <Byline>
    <KeyboardShortcutHint shortcut="↑↓" action="navigate" />
    <KeyboardShortcutHint shortcut="Enter" action="select" />
    <ConfigurableShortcutHint action="confirm:no" context="Confirmation" fallback="Esc" description="go back" />
  </Byline>
)

export function WizardNavigationFooter({ instructions = defaultInstructions }: Props): ReactNode {
  const exitState = useExitOnCtrlCDWithKeybindings()
  return (
    <Box marginLeft={3} marginTop={1}>
      <Text dimColor>
        {exitState.pending ? `Press ${exitState.keyName} again to exit` : instructions}
      </Text>
    </Box>
  )
}
