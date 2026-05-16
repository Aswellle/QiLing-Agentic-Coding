import React, { useEffect, useState } from 'react'
import { Box, Text } from 'ink'
import type { TokenUsage } from '../types/message'
import { formatUsageLine, formatTokenCount } from '../utils/tokens'
import { formatCostUSD, getCacheHitRate } from '../cost-tracker'
import { getCurrentTip, maybeAdvanceTip } from '../services/tips'
import { calculateTokenWarningState } from '../compact/autoCompact'
import { type PrStatus, fetchPrStatus } from '../utils/ghPrStatus'
import { type EffortLevel, getEffortSuffix } from '../utils/effort'
import { useTheme } from '../utils/themeContext'

interface Props {
  model: string
  usage: TokenUsage
  contextWindow: number
  isStreaming: boolean
  rounds: number
  retryStatus?: string | null
  mode?: 'act' | 'acceptEdits' | 'plan'
  totalCostUSD?: number
  bgSessionCount?: number
  vimMode?: boolean
  vimDisplayMode?: 'INSERT' | 'NORMAL'
  pendingVimOp?: string
  showTips?: boolean
  effortLevel?: EffortLevel
}

export function StatusBar({
  model, usage, contextWindow, isStreaming, rounds,
  retryStatus, mode = 'act', totalCostUSD, bgSessionCount = 0,
  vimMode = false, vimDisplayMode = 'INSERT', pendingVimOp,
  showTips = true, effortLevel,
}: Props) {
  const { theme } = useTheme()

  const totalTokens = usage.inputTokens + usage.outputTokens
  const usagePct = contextWindow > 0 ? Math.round((totalTokens / contextWindow) * 100) : 0

  const warningState = calculateTokenWarningState(usage, model)
  const usageColor = warningState.level === 'blocked' ? theme.error
    : warningState.level === 'critical' ? theme.error
    : warningState.level === 'warn' ? theme.warning
    : theme.success
  const contextWarning = warningState.level !== 'ok' && !isStreaming
    ? warningState.level === 'blocked'
      ? `上下文已满 · 请运行 /compact`
      : warningState.level === 'critical'
        ? `上下文剩余 ${100 - usagePct}% · 建议运行 /compact`
        : null
    : null

  const effortSuffix = effortLevel && effortLevel !== 'low' ? getEffortSuffix(effortLevel) : ''
  const shortModel = model.length > 24 ? model.slice(0, 22) + '…' : model
  const showCost = totalCostUSD !== undefined && totalCostUSD > 0

  const cacheHitPct = Math.round(getCacheHitRate() * 100)
  const showCache = cacheHitPct > 0

  const [prStatus, setPrStatus] = useState<PrStatus | null>(null)
  useEffect(() => {
    if (isStreaming) return
    fetchPrStatus().then(status => setPrStatus(status)).catch(() => {})
    const interval = setInterval(() => {
      fetchPrStatus().then(s => setPrStatus(s)).catch(() => {})
    }, 60_000)
    return () => clearInterval(interval)
  }, [isStreaming])

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
          <Text color={theme.warning}>⟳ {retryStatus}</Text>
        </Box>
      )}

      {contextWarning && (
        <Box>
          <Text color={warningState.level === 'blocked' ? theme.error : theme.warning} bold={warningState.level === 'blocked'}>
            ⚠ {contextWarning}
          </Text>
        </Box>
      )}

      {showTips && !isStreaming && !contextWarning && tip && (
        <Box>
          <Text color={theme.inactive} dimColor>💡 {tip.content}</Text>
        </Box>
      )}

      <Box flexDirection="row" justifyContent="space-between">
        {/* Left: vim mode + mode badge + model + streaming + bg count */}
        <Box flexDirection="row" gap={1}>
          {vimMode && (
            <Text color={vimDisplayMode === 'NORMAL' ? theme.warning : theme.inactive} bold>
              {vimDisplayMode === 'NORMAL'
                ? (pendingVimOp ? `[N:${pendingVimOp}]` : '[N]')
                : '[I]'}
            </Text>
          )}
          {mode === 'acceptEdits' && (
            <Text color={theme.autoAccept} bold>[AUTO]</Text>
          )}
          {mode === 'plan' && (
            <Text color={theme.planMode} bold>[PLAN]</Text>
          )}
          <Text color={theme.inactive}>{shortModel}{effortSuffix}</Text>
          {isStreaming && <Text color={theme.warning}>⟳</Text>}
          {rounds > 0 && <Text color={theme.subtle}>·{rounds}r</Text>}
          {bgSessionCount > 0 && (
            <Text color={theme.purple_FOR_SUBAGENTS_ONLY}>⬤ {bgSessionCount}bg</Text>
          )}
          {prStatus && (
            <Text color={
              prStatus.reviewState === 'approved' ? theme.success
              : prStatus.reviewState === 'changes_requested' ? theme.error
              : prStatus.reviewState === 'draft' ? theme.inactive
              : theme.warning
            }>
              PR#{prStatus.number}:{prStatus.reviewState === 'approved' ? '✓' : prStatus.reviewState === 'changes_requested' ? '✗' : prStatus.reviewState === 'draft' ? 'draft' : '…'}
            </Text>
          )}
        </Box>

        {/* Right: cost + cache + tokens + context% */}
        <Box flexDirection="row" gap={1}>
          {showCost && (
            <>
              <Text color={theme.success}>{formatCostUSD(totalCostUSD!)}</Text>
              <Text color={theme.subtle}>·</Text>
            </>
          )}
          {showCache && (
            <>
              <Text color={cacheHitPct >= 50 ? theme.success : theme.suggestion}>
                cache {cacheHitPct}%
              </Text>
              <Text color={theme.subtle}>·</Text>
            </>
          )}
          {totalTokens > 0 && (
            <>
              <Text color={theme.inactive}>{formatUsageLine(usage, model)}</Text>
              <Text color={theme.subtle}>·</Text>
            </>
          )}
          {usage.cacheReadTokens > 0 && !showCache && (
            <>
              <Text color={theme.suggestion}>cache↓{formatTokenCount(usage.cacheReadTokens)}</Text>
              <Text color={theme.subtle}>·</Text>
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
