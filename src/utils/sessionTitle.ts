/**
 * AI session title generation — inspired by CC's utils/sessionTitle.ts
 *
 * Generates a concise 3-7 word title from the user's first message
 * using a fast model call. Used for session naming in /resume picker.
 */

import type { Message } from '../types/message'
import { extractTextContent } from './messages'

const MAX_CONVERSATION_TEXT = 1000
const SESSION_TITLE_SYSTEM = `Generate a concise, sentence-case title (3-7 words) that captures the main topic or goal of this coding session. The title should be clear enough that the user recognizes the session in a list. Use sentence case: capitalize only the first word and proper nouns.

Return JSON with a single "title" field.

Good examples:
{"title": "Fix login button on mobile"}
{"title": "Add OAuth authentication"}
{"title": "Debug failing CI tests"}
{"title": "Refactor API client error handling"}

Bad (too vague): {"title": "Code changes"}
Bad (too long): {"title": "Investigate and fix the issue where..."}`

/** Extract readable text from messages for title generation. */
export function extractConversationText(messages: Message[]): string {
  const parts: string[] = []
  for (const msg of messages) {
    if (msg.isMeta) continue
    const text = extractTextContent(msg.content)
    if (text.trim()) parts.push(text.trim())
  }
  const text = parts.join('\n')
  return text.length > MAX_CONVERSATION_TEXT ? text.slice(-MAX_CONVERSATION_TEXT) : text
}

/**
 * Generate a session title using a fast Haiku API call.
 * Returns null on any error (non-blocking, best-effort).
 */
export async function generateSessionTitle(
  description: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const trimmed = description.trim()
  if (!trimmed) return null

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 128,
        system: SESSION_TITLE_SYSTEM,
        messages: [{ role: 'user', content: trimmed }],
      }),
      signal: signal ?? AbortSignal.timeout(10_000),
    })

    if (!resp.ok) return null
    const data = await resp.json() as { content?: Array<{ type: string; text?: string }> }
    const text = data.content?.find(b => b.type === 'text')?.text
    if (!text) return null

    const parsed = JSON.parse(text.trim()) as { title?: string }
    return parsed.title?.trim() || null
  } catch {
    return null
  }
}
