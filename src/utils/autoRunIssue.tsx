/**
 * Auto-run issue utilities — adapted from CC's utils/autoRunIssue.tsx
 *
 * Component and utilities for automatically running /issue feedback capture.
 * External builds: shouldAutoRunIssue always returns false.
 */

import React, { useEffect, useRef } from 'react'
import { Box, Text } from 'ink'
import { KeyboardShortcutHint } from '../components/design-system/KeyboardShortcutHint.js'
import { useKeybinding } from '../keybindings/useKeybinding.js'

type Props = {
  onRun: () => void
  onCancel: () => void
  reason: string
}

export function AutoRunIssueNotification({ onRun, onCancel, reason }: Props): React.ReactNode {
  const hasRunRef = useRef(false)
  useKeybinding('confirm:no', onCancel, { context: 'Confirmation' })
  useEffect(() => {
    if (!hasRunRef.current) { hasRunRef.current = true; onRun() }
  }, [onRun])

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box><Text bold>Running feedback capture...</Text></Box>
      <Box><Text dimColor>Press <KeyboardShortcutHint shortcut="Esc" action="cancel" /> anytime</Text></Box>
      <Box><Text dimColor>Reason: {reason}</Text></Box>
    </Box>
  )
}

export type AutoRunIssueReason = 'feedback_survey_bad' | 'feedback_survey_good'

export function shouldAutoRunIssue(_reason: AutoRunIssueReason): boolean {
  return false // External builds: never auto-run
}

export function getAutoRunCommand(_reason: AutoRunIssueReason): string {
  return '/issue'
}

export function getAutoRunIssueReasonText(reason: AutoRunIssueReason): string {
  switch (reason) {
    case 'feedback_survey_bad': return 'You responded "Bad" to the feedback survey'
    case 'feedback_survey_good': return 'You responded "Good" to the feedback survey'
    default: return 'Unknown reason'
  }
}
