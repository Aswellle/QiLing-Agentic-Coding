import React from 'react'
import { Box, Text } from 'ink'
import type { TokenUsage } from '../types/message'
import { formatUsageLine, formatTokenCount } from '../utils/tokens'

interface Props {
  model: string
  usage: TokenUsage
  contextWindow: number
  isStreaming: boolean
  rounds: number
  retryStatus?: string | null
  mode?: 'act' | 'plan'
}

export function StatusBar({ model, usage, contextWindow, isStreaming, rounds, retryStatus, mode = 'act' }: Props) {
  const totalTokens = usage.inputTokens + usage.outputTokens
  const usagePct = contextWindow > 0 ? Math.round((totalTokens / contextWindow) * 100) : 0
  const usageColor = usagePct > 85 ? 'red' : usagePct > 70 ? 'yellow' : 'green'

  const shortModel = model.length > 24 ? model.slice(0, 22) + '…' : model

  return (
    <Box flexDirection="column">
      {retryStatus && (
        <Box>
          <Text color="yellow">⟳ {retryStatus}</Text>
        </Box>
      )}
      <Box flexDirection="row" justifyContent="space-between">
        {/* Left: mode badge + model + streaming status */}
        <Box flexDirection="row" gap={1}>
          {mode === 'plan' && (
            <Text color="cyan" bold>[PLAN]</Text>
          )}
          <Text color="gray">{shortModel}</Text>
          {isStreaming && <Text color="yellow">⟳</Text>}
          {rounds > 0 && <Text color="gray">·{rounds}r</Text>}
        </Box>

        {/* Right: cost + context usage */}
        <Box flexDirection="row" gap={1}>
          {totalTokens > 0 && (
            <>
              <Text color="gray">{formatUsageLine(usage, model)}</Text>
              <Text color="gray">·</Text>
            </>
          )}
          {(usage.cacheReadTokens > 0) && (
            <>
              <Text color="blue">cache↓{formatTokenCount(usage.cacheReadTokens)}</Text>
              <Text color="gray">·</Text>
            </>
          )}
          <Text color={usageColor}>
            ctx {usagePct}%
          </Text>
        </Box>
      </Box>
    </Box>
  )
}
