/**
 * Away summary — ported from CC's services/awaySummary.ts
 *
 * Generates a short 1-3 sentence recap shown when the user returns to a session
 * that has been running for a while. Focuses on the high-level task and next step.
 *
 * CC uses queryModelWithoutStreaming (a direct non-streaming API call).
 * QiLing adaptation: uses provider.stream() with a small token budget.
 */

import type { Message } from '../types/message'
import type { Provider } from '../types/provider'

// Only recap the most recent exchanges
const RECENT_MESSAGE_WINDOW = 30

function buildAwaySummaryPrompt(sessionMemory: string | null): string {
  const memBlock = sessionMemory
    ? `Session memory (broader context):\n${sessionMemory}\n\n`
    : ''
  return [
    memBlock,
    'The user stepped away and is coming back.',
    'Write exactly 1-3 short sentences.',
    'Start by stating the high-level task — what they are building or debugging, not implementation details.',
    'Next: the concrete next step.',
    'Skip status reports and commit recaps.',
  ].join(' ')
}

function buildConversationExcerpt(messages: Message[]): string {
  return messages
    .filter(m =>
      (m.role === 'user' || m.role === 'assistant') &&
      !(m as { isMeta?: boolean }).isMeta
    )
    .slice(-RECENT_MESSAGE_WINDOW)
    .map(m => {
      const role = m.role === 'user' ? 'Human' : 'Assistant'
      const text = typeof m.content === 'string'
        ? m.content
        : Array.isArray(m.content)
          ? m.content
              .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
              .map(b => b.text)
              .join(' ')
          : ''
      return `${role}: ${text.slice(0, 300)}`
    })
    .join('\n\n')
}

/**
 * Generate a short session recap for the "while you were away" display.
 *
 * Returns null on abort, empty conversation, or provider error.
 *
 * @param messages Current conversation messages
 * @param provider Provider for AI calls (uses smallest/fastest model)
 * @param sessionMemory Optional session memory content for context
 * @param signal AbortSignal for cancellation
 */
export async function generateAwaySummary(
  messages: readonly Message[],
  provider: Provider,
  sessionMemory: string | null = null,
  signal?: AbortSignal,
): Promise<string | null> {
  if (messages.length === 0) return null
  if (signal?.aborted) return null

  const conversation = buildConversationExcerpt([...messages])
  if (!conversation.trim()) return null

  const prompt = buildAwaySummaryPrompt(sessionMemory)

  try {
    const stream = provider.stream(
      [{ role: 'user', content: `${conversation}\n\n---\n\n${prompt}` }],
      [],
      {
        systemPrompt: 'You summarize sessions very briefly for returning users. Be direct and concise.',
        maxTokens: 150,
      }
    )

    let text = ''
    for await (const chunk of stream) {
      if (signal?.aborted) return null
      if (chunk.type === 'text_delta') text += chunk.text
      if (chunk.type === 'stop') break
    }

    const summary = text.trim()
    return summary || null
  } catch {
    return null
  }
}

/**
 * Format the away summary for display in the terminal.
 */
export function formatAwaySummary(summary: string): string {
  return [
    '┌─ 您离开期间 ───────────────────────────────────────────',
    `│ ${summary.replace(/\n/g, '\n│ ')}`,
    '└──────────────────────────────────────────────────────',
  ].join('\n')
}
