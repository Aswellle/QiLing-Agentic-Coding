/**
 * Context usage suggestions — ported from CC's utils/contextSuggestions.ts
 *
 * Analyzes conversation context and provides actionable suggestions to
 * reduce context window usage. Used by the /context command.
 */

import type { ContextAnalysis } from './analyzeContext'

export type SuggestionSeverity = 'info' | 'warning'

export type ContextSuggestion = {
  severity: SuggestionSeverity
  title: string
  detail: string
  savingsTokens?: number
}

// Thresholds
const NEAR_CAPACITY_PERCENT = 80
const COMPACT_SUGGESTED_PERCENT = 60
const LARGE_OUTPUT_TOKENS = 10_000

/**
 * Generate suggestions for reducing context window usage.
 * Returns sorted list (warnings first, then by savings descending).
 */
export function generateContextSuggestions(
  analysis: ContextAnalysis,
): ContextSuggestion[] {
  const suggestions: ContextSuggestion[] = []
  const { usedPct, remainingTokens, inputTokens, contextWindowSize } = analysis

  // Near capacity: critical warning
  if (usedPct >= NEAR_CAPACITY_PERCENT) {
    suggestions.push({
      severity: 'warning',
      title: '上下文即将耗尽',
      detail: `已用 ${usedPct}%，剩余约 ${remainingTokens.toLocaleString()} tokens。立即运行 /compact 压缩对话。`,
      savingsTokens: Math.floor(inputTokens * 0.4),
    })
  } else if (usedPct >= COMPACT_SUGGESTED_PERCENT) {
    suggestions.push({
      severity: 'info',
      title: '建议压缩对话',
      detail: `已用 ${usedPct}%（${remainingTokens.toLocaleString()} tokens 剩余）。可运行 /compact 释放空间。`,
      savingsTokens: Math.floor(inputTokens * 0.3),
    })
  }

  // High tool output usage
  if (inputTokens > LARGE_OUTPUT_TOKENS && usedPct > 40) {
    suggestions.push({
      severity: 'info',
      title: '工具输出占用较多空间',
      detail: '较大的工具输出（如 Bash/Grep）已被自动持久化到磁盘，未来调用会更快。',
      savingsTokens: Math.floor(inputTokens * 0.15),
    })
  }

  // Many tool calls per turn
  if (analysis.toolCallMessages > 10) {
    suggestions.push({
      severity: 'info',
      title: '工具调用次数较多',
      detail: `本次会话共 ${analysis.toolCallMessages} 次工具调用。对话历史越长，上下文消耗越多。`,
    })
  }

  // Sort: warnings first, then by savings descending
  suggestions.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'warning' ? -1 : 1
    return (b.savingsTokens ?? 0) - (a.savingsTokens ?? 0)
  })

  return suggestions
}

/**
 * Format suggestions as a human-readable string.
 */
export function formatContextSuggestions(suggestions: ContextSuggestion[]): string {
  if (suggestions.length === 0) return ''
  const lines = ['\n**建议:**']
  for (const s of suggestions) {
    const icon = s.severity === 'warning' ? '⚠️' : 'ℹ️'
    const savings = s.savingsTokens ? ` (可节省约 ${s.savingsTokens.toLocaleString()} tokens)` : ''
    lines.push(`${icon} **${s.title}**${savings}`)
    lines.push(`   ${s.detail}`)
  }
  return lines.join('\n')
}
