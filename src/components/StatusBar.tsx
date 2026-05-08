import React, { useEffect, useState } from 'react'
import { Box, Text } from 'ink'
import type { TokenUsage } from '../types/message'
import { formatUsageLine, formatTokenCount } from '../utils/tokens'
import { formatCostUSD, getCacheHitRate } from '../cost-tracker'
import { getCurrentTip, maybeAdvanceTip } from '../services/tips'
import { calculateTokenWarningState } from '../compact/autoCompact'
import { type PrStatus, fetchPrStatus } from '../utils/ghPrStatus'

interface Props {
  model: string
  usage: TokenUsage
  contextWindow: number
  isStreaming: boolean
  rounds: number
  retryStatus?: string | null
  mode?: 'act' | 'plan'
  totalCostUSD?: number
  bgSessionCount?: number
  vimMode?: boolean
  vimDisplayMode?: 'INSERT' | 'NORMAL'
  pendingVimOp?: string  // e.g. "d" "c" "y" when operator is pending
  showTips?: boolean
}

export function StatusBar({
  model, usage, contextWindow, isStreaming, rounds,
  retryStatus, mode = 'act', totalCostUSD, bgSessionCount = 0,
  vimMode = false, vimDisplayMode = 'INSERT', pendingVimOp,
  showTips = true,
}: Props) {
  const totalTokens = usage.inputTokens + usage.outputTokens
  const usagePct = contextWindow > 0 ? Math.round((totalTokens / contextWindow) * 100) : 0

  // CC's calculateTokenWarningState for nuanced context warnings
  const warningState = calculateTokenWarningState(usage, model)
  const usageColor = warningState.level === 'blocked' ? 'red'
    : warningState.level === 'critical' ? 'red'
    : warningState.level === 'warn' ? 'yellow'
    : 'green'
  const contextWarning = warningState.level !== 'ok' && !isStreaming
    ? warningState.level === 'blocked'
      ? `上下文已满 · 请运行 /compact`
      : warningState.level === 'critical'
        ? `上下文剩余 ${100 - usagePct}% · 建议运行 /compact`
        : null
    : null

  const shortModel = model.length > 24 ? model.slice(0, 22) + '…' : model
  const showCost = totalCostUSD !== undefined && totalCostUSD > 0

  const cacheHitPct = Math.round(getCacheHitRate() * 100)
  const showCache = cacheHitPct > 0

  // PR status — fetched once and cached (CC's usePrStatus pattern)
  const [prStatus, setPrStatus] = useState<PrStatus | null>(null)
  useEffect(() => {
    if (isStreaming) return  // Don't fetch while streaming
    fetchPrStatus().then(status => setPrStatus(status)).catch(() => {})
    // Re-fetch every 60 seconds
    const interval = setInterval(() => {
      fetchPrStatus().then(s => setPrStatus(s)).catch(() => {})
    }, 60_000)
    return () => clearInterval(interval)
  }, [isStreaming])

  // Rotating tip — updates every 30 seconds
  const [tip, setTip] = useState(() => getCurrentTip())
  useEffect(() => {
    if (!showTips) return
    const interval = setInterval(() => {
      maybeAdvanceTip()
      setTip(getCurrentTip())
    }, 5_000)
    return () => clearInterval(interval)
  }, [showTips])

  return (
    <Box flexDirection="column">
      {retryStatus && (
        <Box>
          <Text color="yellow">⟳ {retryStatus}</Text>
        </Box>
      )}

      {/* Context warning row — shown when context is getting full (CC's TokenWarning pattern) */}
      {contextWarning && (
        <Box>
          <Text color={warningState.level === 'blocked' ? 'red' : 'yellow'} bold={warningState.level === 'blocked'}>
            ⚠ {contextWarning}
          </Text>
        </Box>
      )}

      {/* Tip row — shown when not streaming and not warning */}
      {showTips && !isStreaming && !contextWarning && tip && (
        <Box>
          <Text color="gray" dimColor>💡 {tip.content}</Text>
        </Box>
      )}

      <Box flexDirection="row" justifyContent="space-between">
        {/* Left: vim mode + pending op + plan badge + model + streaming + bg pill */}
        <Box flexDirection="row" gap={1}>
          {vimMode && (
            <Text color={vimDisplayMode === 'NORMAL' ? 'yellow' : 'gray'} bold>
              {vimDisplayMode === 'NORMAL'
                ? (pendingVimOp ? `[N:${pendingVimOp}]` : '[N]')
                : '[I]'}
            </Text>
          )}
          {mode === 'plan' && (
            <Text color="cyan" bold>[PLAN]</Text>
          )}
          <Text color="gray">{shortModel}</Text>
          {isStreaming && <Text color="yellow">⟳</Text>}
          {rounds > 0 && <Text color="gray">·{rounds}r</Text>}
          {bgSessionCount > 0 && (
            <Text color="magenta">⬤ {bgSessionCount}bg</Text>
          )}
          {/* CC's PR status display (usePrStatus pattern) */}
          {prStatus && (
            <Text color={
              prStatus.reviewState === 'approved' ? 'green'
              : prStatus.reviewState === 'changes_requested' ? 'red'
              : prStatus.reviewState === 'draft' ? 'gray'
              : 'yellow'
            }>
              PR#{prStatus.number}:{prStatus.reviewState === 'approved' ? '✓' : prStatus.reviewState === 'changes_requested' ? '✗' : prStatus.reviewState === 'draft' ? 'draft' : '…'}
            </Text>
          )}
        </Box>

        {/* Right: cost + cache rate + tokens + context usage */}
        <Box flexDirection="row" gap={1}>
          {showCost && (
            <>
              <Text color="green">{formatCostUSD(totalCostUSD!)}</Text>
              <Text color="gray">·</Text>
            </>
          )}
          {showCache && (
            <>
              <Text color={cacheHitPct >= 50 ? 'green' : 'blue'}>
                cache {cacheHitPct}%
              </Text>
              <Text color="gray">·</Text>
            </>
          )}
          {totalTokens > 0 && (
            <>
              <Text color="gray">{formatUsageLine(usage, model)}</Text>
              <Text color="gray">·</Text>
            </>
          )}
          {usage.cacheReadTokens > 0 && !showCache && (
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
