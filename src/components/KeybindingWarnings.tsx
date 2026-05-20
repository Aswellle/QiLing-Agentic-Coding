/**
 * KeybindingWarnings — adapted from CC's components/KeybindingWarnings.tsx
 *
 * Displays keybinding validation warnings from the user's keybindings.json.
 * Shows error/warning messages with location and suggestions.
 * Only rendered when there are validation issues to report.
 */

import React from 'react'
import { Box, Text } from 'ink'
import type { KeybindingWarning } from '../keybindings/validate.js'
import { homedir } from 'os'
import { join } from 'path'

type Props = {
  warnings: KeybindingWarning[]
}

function getKeybindingsPath(): string {
  return join(homedir(), '.qiling', 'keybindings.json')
}

export function KeybindingWarnings({ warnings }: Props): React.ReactNode {
  if (warnings.length === 0) return null

  const errors = warnings.filter(w => w.severity === 'error')
  const warns = warnings.filter(w => w.severity === 'warning')

  return (
    <Box flexDirection="column" marginTop={1} marginBottom={1}>
      <Text bold color={errors.length > 0 ? 'red' : 'yellow'}>
        Keybinding Configuration Issues
      </Text>
      <Box>
        <Text dimColor>Location: </Text>
        <Text dimColor>{getKeybindingsPath()}</Text>
      </Box>
      <Box marginLeft={1} flexDirection="column" marginTop={1}>
        {errors.map((error, i) => (
          <Box key={`error-${i}`} flexDirection="column">
            <Box>
              <Text dimColor>└ </Text>
              <Text color="red">[Error]</Text>
              <Text dimColor> {error.message}</Text>
            </Box>
            {error.suggestion && <Box marginLeft={3}><Text dimColor>→ {error.suggestion}</Text></Box>}
          </Box>
        ))}
        {warns.map((warning, i) => (
          <Box key={`warning-${i}`} flexDirection="column">
            <Box>
              <Text dimColor>└ </Text>
              <Text color="yellow">[Warning]</Text>
              <Text dimColor> {warning.message}</Text>
            </Box>
            {warning.suggestion && <Box marginLeft={3}><Text dimColor>→ {warning.suggestion}</Text></Box>}
          </Box>
        ))}
      </Box>
    </Box>
  )
}
