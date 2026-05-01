import React from 'react'
import { Box, Text } from 'ink'
import type { TokenUsage } from '../types/message'

interface Props {
  model: string
  usage: TokenUsage
  contextWindow: number
  isStreaming: boolean
  rounds: number
}

export function StatusBar({ model, usage, contextWindow, isStreaming, rounds }: Props) {
  const totalTokens = usage.inputTokens + usage.outputTokens
  const usagePct = Math.round((totalTokens / contextWindow) * 100)
  const usageColor = usagePct > 80 ? 'red' : usagePct > 60 ? 'yellow' : 'green'

  return (
    <Box flexDirection="row" justifyContent="space-between" marginTop={0}>
      <Box flexDirection="row" gap={1}>
        <Text color="gray">{model}</Text>
        {isStreaming && <Text color="yellow"> ⟳ streaming</Text>}
        {rounds > 0 && <Text color="gray"> · round {rounds}</Text>}
      </Box>
      <Box flexDirection="row" gap={1}>
        {(usage.cacheReadTokens > 0 || usage.cacheWriteTokens > 0) && (
          <Text color="blue">cache: {Math.round(usage.cacheReadTokens / 1000)}k↓{Math.round(usage.cacheWriteTokens / 1000)}k↑  </Text>
        )}
        <Text color={usageColor}>
          ctx: {Math.round(totalTokens / 1000)}k / {Math.round(contextWindow / 1000)}k ({usagePct}%)
        </Text>
      </Box>
    </Box>
  )
}
