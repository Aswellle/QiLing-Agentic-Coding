import type { TokenUsage, Message } from '../types/message'

// ─── Rough token estimation (CC's roughTokenCountEstimation pattern) ──────────
// ~4 bytes per token for English text; 2 for JSON-heavy content
const BYTES_PER_TOKEN = 4

/**
 * Rough token estimate for a string.
 * Used to pre-estimate context size before API call (no API call required).
 */
export function roughTokenCountEstimation(content: string, bytesPerToken = BYTES_PER_TOKEN): number {
  return Math.ceil(content.length / bytesPerToken)
}

/**
 * Get bytes-per-token ratio for a specific file type.
 * Dense JSON has more single-char tokens → ratio closer to 2.
 * Mirrors CC's bytesPerTokenForFileType() from services/tokenEstimation.ts.
 */
export function bytesPerTokenForFileType(fileExtension: string): number {
  switch (fileExtension.replace(/^\./, '').toLowerCase()) {
    case 'json': case 'jsonl': case 'jsonc': case 'yaml': case 'yml': return 2
    default: return 4
  }
}

/**
 * Rough token estimate for file content, accounting for file type.
 * More accurate than roughTokenCountEstimation() for code/JSON files.
 */
export function roughTokenCountEstimationForFile(content: string, fileExtension: string): number {
  return Math.ceil(content.length / bytesPerTokenForFileType(fileExtension))
}

/**
 * Rough token estimate across a set of messages.
 * Mirrors CC's roughTokenCountEstimationForMessages().
 */
export function roughTokenCountEstimationForMessages(messages: Message[]): number {
  let total = 0
  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      total += roughTokenCountEstimation(msg.content)
    } else {
      for (const block of msg.content) {
        if (block.type === 'text') total += roughTokenCountEstimation(block.text)
        else if (block.type === 'tool_use') total += roughTokenCountEstimation(JSON.stringify(block.input))
        else if (block.type === 'tool_result') {
          const c = block.content
          total += roughTokenCountEstimation(typeof c === 'string' ? c : JSON.stringify(c))
        }
      }
    }
    total += 4  // per-message overhead (role token etc.)
  }
  return total
}

/** Pricing per 1M tokens in USD */
interface ModelPricing {
  input: number    // per 1M input tokens
  output: number   // per 1M output tokens
  cacheRead?: number
  cacheWrite?: number
}

// Reference pricing (update as providers change rates)
const PRICING: Record<string, ModelPricing> = {
  // Anthropic
  'claude-opus-4-7': { input: 15.0, output: 75.0, cacheRead: 1.5, cacheWrite: 18.75 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0, cacheRead: 0.08, cacheWrite: 1.0 },
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0, cacheRead: 0.3, cacheWrite: 3.75 },
  // OpenAI
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  // MiniMax (estimated, check docs.minimax.io for current rates)
  'MiniMax-Text-01': { input: 1.0, output: 4.0 },
  'abab6.5s-chat': { input: 0.3, output: 1.2 },
  // Google Gemini
  'gemini-2.0-flash': { input: 0.075, output: 0.3 },
  'gemini-1.5-pro': { input: 1.25, output: 5.0 },
}

/** USD → CNY approximate rate */
const USD_TO_CNY = 7.2

export interface CostBreakdown {
  inputCostUSD: number
  outputCostUSD: number
  cacheReadCostUSD: number
  cacheWriteCostUSD: number
  totalUSD: number
  totalCNY: number
  /** Formatted string for display, e.g. "¥0.08 (~$0.01)" */
  display: string
}

export function calculateCost(usage: TokenUsage, model: string): CostBreakdown {
  const pricing = PRICING[model]
  if (!pricing) {
    // Unknown model — return zero cost
    return { inputCostUSD: 0, outputCostUSD: 0, cacheReadCostUSD: 0, cacheWriteCostUSD: 0, totalUSD: 0, totalCNY: 0, display: '?' }
  }

  const inputCostUSD = (usage.inputTokens / 1_000_000) * pricing.input
  const outputCostUSD = (usage.outputTokens / 1_000_000) * pricing.output
  const cacheReadCostUSD = (usage.cacheReadTokens / 1_000_000) * (pricing.cacheRead ?? 0)
  const cacheWriteCostUSD = (usage.cacheWriteTokens / 1_000_000) * (pricing.cacheWrite ?? 0)
  const totalUSD = inputCostUSD + outputCostUSD + cacheReadCostUSD + cacheWriteCostUSD
  const totalCNY = totalUSD * USD_TO_CNY

  let display: string
  if (totalCNY < 0.01) {
    display = `<¥0.01`
  } else if (totalCNY < 1) {
    display = `¥${totalCNY.toFixed(3)}`
  } else {
    display = `¥${totalCNY.toFixed(2)}`
  }

  return { inputCostUSD, outputCostUSD, cacheReadCostUSD, cacheWriteCostUSD, totalUSD, totalCNY, display }
}

export function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export function formatUsageLine(usage: TokenUsage, model: string): string {
  const total = usage.inputTokens + usage.outputTokens
  const cost = calculateCost(usage, model)
  const parts = [`${formatTokenCount(total)} tokens`]
  if (cost.totalUSD > 0) parts.push(cost.display)
  if (usage.cacheReadTokens > 0) {
    parts.push(`cache↓${formatTokenCount(usage.cacheReadTokens)}`)
  }
  return parts.join(' · ')
}

// ─── CC-aligned canonical token counting (from CC's utils/tokens.ts) ─────────

const SYNTHETIC_MODEL = '__synthetic__'
const SYNTHETIC_MESSAGES_SET = new Set(['__synthetic_message__'])

type UsageLike = {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

type AssistantMsgInner = Message & {
  message?: {
    id?: string
    model?: string
    usage?: UsageLike
    content?: Array<{ type: string; text?: string; thinking?: string; data?: string; input?: unknown }>
  }
}

function getAPITokenUsage(message: Message): UsageLike | undefined {
  const m = message as AssistantMsgInner
  if (m.role === 'assistant' && m.message?.usage && m.message.model !== SYNTHETIC_MODEL) {
    const firstBlock = m.message.content?.[0]
    if (firstBlock?.type === 'text' && firstBlock.text && SYNTHETIC_MESSAGES_SET.has(firstBlock.text)) {
      return undefined
    }
    return m.message.usage
  }
  return undefined
}

function getAPIResponseId(message: Message): string | undefined {
  const m = message as AssistantMsgInner
  if (m.role === 'assistant' && m.message?.id && m.message.model !== SYNTHETIC_MODEL) {
    return m.message.id
  }
  return undefined
}

/**
 * Total context tokens from a usage object: input + cache_creation + cache_read + output.
 */
export function getTokenCountFromUsage(usage: UsageLike): number {
  return (
    usage.input_tokens +
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0) +
    usage.output_tokens
  )
}

/**
 * Current token usage from the last API response.
 */
export function getCurrentUsage(messages: Message[]): {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
} | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const usage = getAPITokenUsage(messages[i]!)
    if (usage) {
      return {
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
      }
    }
  }
  return null
}

/**
 * True if the most recent assistant message exceeds 200k context tokens.
 */
export function doesMostRecentAssistantMessageExceed200k(messages: Message[]): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]!.role === 'assistant') {
      const usage = getAPITokenUsage(messages[i]!)
      return usage ? getTokenCountFromUsage(usage) > 200_000 : false
    }
  }
  return false
}

/**
 * CANONICAL context window size for threshold comparisons (autocompact, session memory).
 *
 * Uses the last API response's usage + estimation for new messages.
 * Handles parallel tool calls: walks back to the first sibling of the same API response.
 *
 * Always use this instead of tokenCountFromLastAPIResponse (doesn't estimate new msgs).
 */
export function tokenCountWithEstimation(messages: readonly Message[]): number {
  let i = messages.length - 1
  while (i >= 0) {
    const message = messages[i]
    if (!message) { i--; continue }
    const usage = getAPITokenUsage(message)
    if (usage) {
      const responseId = getAPIResponseId(message)
      if (responseId) {
        let j = i - 1
        while (j >= 0) {
          const prior = messages[j]!
          const priorId = getAPIResponseId(prior)
          if (priorId === responseId) i = j
          else if (priorId !== undefined) break
          j--
        }
      }
      return (
        getTokenCountFromUsage(usage) +
        roughTokenCountEstimationForMessages([...messages.slice(i + 1)])
      )
    }
    i--
  }
  return roughTokenCountEstimationForMessages([...messages])
}

// FROM CC: tokenCountFromLastAPIResponse — scan backwards for last real usage, return full context count
export function tokenCountFromLastAPIResponse(messages: Message[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    const usage = getAPITokenUsage(messages[i]!)
    if (usage) return getTokenCountFromUsage(usage)
  }
  return 0
}

// FROM CC: finalContextTokensFromLastResponse — uses iterations[last] for server-side tool loop budget
export function finalContextTokensFromLastResponse(messages: Message[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    const usage = getAPITokenUsage(messages[i]!)
    if (usage) {
      const iterations = (usage as { iterations?: Array<{ input_tokens: number; output_tokens: number }> | null }).iterations
      if (iterations && iterations.length > 0) {
        const last = iterations.at(-1)!
        return last.input_tokens + last.output_tokens
      }
      // No iterations → top-level usage IS the final window (input + output, no cache)
      return usage.input_tokens + usage.output_tokens
    }
  }
  return 0
}

// FROM CC: messageTokenCountFromLastAPIResponse — output_tokens only (how much Claude generated)
export function messageTokenCountFromLastAPIResponse(messages: Message[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    const usage = getAPITokenUsage(messages[i]!)
    if (usage) return usage.output_tokens
  }
  return 0
}
