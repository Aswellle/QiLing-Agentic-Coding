/**
 * Context analysis utilities — simplified port of CC's utils/analyzeContext.ts
 *
 * Analyzes the current conversation context to provide token usage statistics.
 */

import type { Message, TokenUsage } from '../types/message'

export type ContextAnalysis = {
  totalMessages: number
  userMessages: number
  assistantMessages: number
  toolCallMessages: number
  estimatedTokens: number
  contextWindowSize: number
  usedPct: number
  remainingTokens: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

/** Rough token estimation: ~4 chars per token for mixed content */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function messageText(msg: Message): string {
  if (typeof msg.content === 'string') return msg.content
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map(b => b.text)
      .join('')
  }
  return ''
}

/**
 * Analyze the current conversation context.
 */
export function analyzeContext(
  messages: Message[],
  usage: TokenUsage,
  contextWindowSize: number,
  model: string,
): ContextAnalysis {
  const visibleMessages = messages.filter(m => !(m as { isMeta?: boolean }).isMeta)
  const userMessages = visibleMessages.filter(m => m.role === 'user').length
  const assistantMessages = visibleMessages.filter(m => m.role === 'assistant').length
  const toolCallMessages = visibleMessages.filter(m =>
    m.role === 'assistant' && Array.isArray(m.content) &&
    m.content.some((b: { type: string }) => b.type === 'tool_use')
  ).length

  const totalText = visibleMessages.map(messageText).join('')
  const estimatedTokens = estimateTokens(totalText)

  const totalUsed = usage.inputTokens + usage.outputTokens
  const usedPct = contextWindowSize > 0 ? Math.round((totalUsed / contextWindowSize) * 100) : 0
  const remainingTokens = Math.max(0, contextWindowSize - totalUsed)

  return {
    totalMessages: visibleMessages.length,
    userMessages,
    assistantMessages,
    toolCallMessages,
    estimatedTokens,
    contextWindowSize,
    usedPct,
    remainingTokens,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheReadTokens: usage.cacheReadTokens,
    cacheWriteTokens: usage.cacheWriteTokens,
  }
}

/** Format context analysis as a human-readable string for /context command */
export function formatContextAnalysis(analysis: ContextAnalysis, model: string): string {
  const { usedPct, remainingTokens, contextWindowSize } = analysis

  const statusEmoji = usedPct >= 90 ? '🔴' : usedPct >= 75 ? '🟡' : '🟢'
  const remaining = remainingTokens.toLocaleString()
  const total = contextWindowSize.toLocaleString()

  const lines = [
    `**上下文窗口** ${statusEmoji}  ${usedPct}% 已使用`,
    '',
    `  模型:        ${model}`,
    `  窗口大小:    ${total} tokens`,
    `  输入 tokens: ${analysis.inputTokens.toLocaleString()}`,
    `  输出 tokens: ${analysis.outputTokens.toLocaleString()}`,
    ...(analysis.cacheReadTokens > 0 ? [`  缓存读取:    ${analysis.cacheReadTokens.toLocaleString()}`] : []),
    ...(analysis.cacheWriteTokens > 0 ? [`  缓存写入:    ${analysis.cacheWriteTokens.toLocaleString()}`] : []),
    `  剩余空间:    ${remaining} tokens`,
    '',
    `  消息总数:    ${analysis.totalMessages}`,
    `  用户消息:    ${analysis.userMessages}`,
    `  助手消息:    ${analysis.assistantMessages}`,
    ...(analysis.toolCallMessages > 0 ? [`  工具调用:    ${analysis.toolCallMessages}`] : []),
    '',
    usedPct >= 80
      ? `⚠️  上下文已用 ${usedPct}%，建议运行 /compact 压缩对话`
      : `✓ 上下文空间充足（剩余约 ${remaining} tokens）`,
  ]

  return lines.join('\n')
}
