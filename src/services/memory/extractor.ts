/**
 * Memory extractor — ported from CC's services/extractMemories/
 *
 * At session end, calls the AI to distill key facts from the conversation
 * into a persisted QILING.md memory file.
 */

import type { Message } from '../../types/message'
import type { Provider } from '../../types/provider'

const EXTRACT_SYSTEM = `You extract lasting facts and decisions from an AI programming session.
Output a concise bullet list of things worth remembering for future sessions.
Include: key decisions made, important code patterns learned, user preferences observed, recurring issues, project-specific constraints.
Exclude: ephemeral details, obvious facts, anything already in project docs.
Format: one bullet per item, max 20 items, ≤ 120 chars each.`

export async function extractMemoriesFromSession(
  messages: Message[],
  provider: Provider,
  signal?: AbortSignal
): Promise<string[]> {
  if (messages.length < 4) return []

  // Summarise the session into ~1000 chars for the extractor
  const sessionSummary = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-20)
    .map(m => {
      const content = typeof m.content === 'string'
        ? m.content
        : Array.isArray(m.content)
          ? m.content.filter((c): c is { type: 'text'; text: string } => c.type === 'text')
              .map(c => c.text).join(' ')
          : ''
      return `${m.role}: ${content.slice(0, 200)}`
    })
    .join('\n')

  try {
    const stream = provider.stream(
      [{ role: 'user', content: `Session transcript:\n\n${sessionSummary}\n\nExtract lasting memories as bullets:` }],
      [],
      { systemPrompt: EXTRACT_SYSTEM, maxTokens: 400 }
    )

    let output = ''
    for await (const chunk of stream) {
      if (signal?.aborted) return []
      if (chunk.type === 'text_delta') output += chunk.text
      if (chunk.type === 'stop') break
    }

    return output
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.startsWith('-') || l.startsWith('•') || l.startsWith('*'))
      .map(l => l.replace(/^[-•*]\s*/, '').trim())
      .filter(l => l.length > 0)
  } catch {
    return []
  }
}
