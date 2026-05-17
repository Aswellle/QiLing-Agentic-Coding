/**
 * Agent Summary — ported from CC's services/AgentSummary/agentSummary.ts
 *
 * Generates brief 3-5 word progress summaries for coordinator mode sub-agents.
 * Updates every 30 seconds, shown in the coordinator UI to track agent progress.
 *
 * CC uses runForkedAgent (sharing the parent's prompt cache).
 * QiLing adaptation: direct provider.stream() call with small token budget.
 */

import type { Message } from '../../types/message'
import type { Provider } from '../../types/provider'

const SUMMARY_INTERVAL_MS = 30_000

function buildSummaryPrompt(previousSummary: string | null): string {
  const prevLine = previousSummary
    ? `\nPrevious: "${previousSummary}" — say something NEW.\n`
    : ''

  return `Describe your most recent action in 3-5 words using present tense (-ing). Name the file or function, not the branch. Do not use tools.
${prevLine}
Good: "Reading runAgent.ts"
Good: "Fixing null check in validate.ts"
Good: "Running auth module tests"
Good: "Adding retry logic to fetchUser"

Bad (past tense): "Analyzed the branch diff"
Bad (too vague): "Investigating the issue"
Bad (too long): "Reviewing full branch diff and AgentTool.tsx integration"

Output ONLY the 3-5 word phrase. Nothing else.`
}

function extractSummaryPhrase(responseText: string): string | null {
  const text = responseText.trim()
  if (!text) return null
  // Take just the first line, max 50 chars
  const firstLine = text.split('\n')[0]?.trim() ?? ''
  if (firstLine.length < 3 || firstLine.length > 50) return null
  return firstLine
}

function buildConversationExcerpt(messages: Message[], maxMessages = 10): string {
  return messages
    .filter(m => (m.role === 'user' || m.role === 'assistant') && !(m as { isMeta?: boolean }).isMeta)
    .slice(-maxMessages)
    .map(m => {
      const role = m.role === 'user' ? 'H' : 'A'
      const text = typeof m.content === 'string'
        ? m.content
        : Array.isArray(m.content)
          ? m.content.filter((b): b is { type: 'text'; text: string } => b.type === 'text').map(b => b.text).join(' ')
          : ''
      return `${role}: ${text.slice(0, 200)}`
    })
    .join('\n')
}

/**
 * Generate a one-line progress summary for a sub-agent.
 *
 * @param messages The sub-agent's current conversation
 * @param provider Provider for AI calls (use smallest/fastest model)
 * @param previousSummary The last generated summary (to avoid repetition)
 * @param signal AbortSignal
 * @returns A 3-5 word summary phrase, or null on error/abort
 */
export async function generateAgentSummary(
  messages: Message[],
  provider: Provider,
  previousSummary: string | null = null,
  signal?: AbortSignal,
): Promise<string | null> {
  if (messages.length === 0) return null
  if (signal?.aborted) return null

  const excerptMessages = messages.filter(
    m => (m.role === 'user' || m.role === 'assistant') && !(m as { isMeta?: boolean }).isMeta
  )
  if (excerptMessages.length === 0) return null

  const conversationContext = buildConversationExcerpt(messages)
  const summaryPrompt = buildSummaryPrompt(previousSummary)

  try {
    const stream = provider.stream(
      [
        {
          role: 'user',
          content: `${conversationContext}\n\n---\n\n${summaryPrompt}`,
        },
      ],
      [],
      {
        systemPrompt: 'You summarize agent actions very briefly. Output only the requested phrase.',
        maxTokens: 20,
      }
    )

    let responseText = ''
    for await (const chunk of stream) {
      if (signal?.aborted) return null
      if (chunk.type === 'text_delta') responseText += chunk.text
      if (chunk.type === 'stop') break
    }

    return extractSummaryPhrase(responseText)
  } catch {
    return null
  }
}

// ─── Periodic summarization for coordinator agents ────────────────────────────

export type SummarizationHandle = { stop: () => void }

/**
 * Start periodic background summarization for a coordinator sub-agent.
 * Generates a summary every 30 seconds and calls onSummary with the result.
 *
 * @param messages Function to get current agent messages (called per tick)
 * @param provider Provider for AI calls
 * @param onSummary Callback with the generated summary string
 * @returns Handle with stop() method
 */
export function startAgentSummarization(
  getMessages: () => Message[],
  provider: Provider,
  onSummary: (summary: string) => void,
): SummarizationHandle {
  let stopped = false
  let previousSummary: string | null = null
  let abortController: AbortController | null = null

  const tick = async () => {
    if (stopped) return

    abortController = new AbortController()
    const messages = getMessages()

    const summary = await generateAgentSummary(
      messages,
      provider,
      previousSummary,
      abortController.signal,
    ).catch(() => null)

    if (!stopped && summary) {
      previousSummary = summary
      onSummary(summary)
    }

    abortController = null
  }

  // Start ticking
  const intervalId = setInterval(() => { void tick() }, SUMMARY_INTERVAL_MS)
  // Run first tick after a short delay
  const initialTimeout = setTimeout(() => { void tick() }, 5000)

  return {
    stop: () => {
      stopped = true
      clearInterval(intervalId)
      clearTimeout(initialTimeout)
      abortController?.abort()
    },
  }
}
