/**
 * Context window suggestions panel — adapted from CC's components/ContextSuggestions.tsx
 *
 * Shows actionable suggestions when context usage is high, e.g.:
 * - /compact to reduce token usage
 * - Remove large attachments
 * - Start a new session
 */

import figures from 'figures'
import React from 'react'
import { Box, Text } from 'ink'
import type { ContextSuggestion } from '../utils/contextSuggestions.js'
import { formatTokens } from '../utils/format.js'
import { StatusIcon } from './design-system/StatusIcon.js'

type Props = {
  suggestions: ContextSuggestion[]
}

export function ContextSuggestions({ suggestions }: Props): React.ReactNode {
  if (suggestions.length === 0) return null

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold>建议</Text>
      {suggestions.map((suggestion, i) => (
        <Box key={i} flexDirection="column" marginTop={i === 0 ? 0 : 1}>
          <Box>
            <StatusIcon status={suggestion.severity} withSpace />
            <Text bold>{suggestion.title}</Text>
            {suggestion.savingsTokens ? (
              <Text dimColor>
                {' '}
                {figures.arrowRight} 可节省约 {formatTokens(suggestion.savingsTokens)}
              </Text>
            ) : null}
          </Box>
          <Box marginLeft={2}>
            <Text dimColor>{suggestion.detail}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  )
}
