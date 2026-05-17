/**
 * Prompt Suggestion — simplified port of CC's services/PromptSuggestion/promptSuggestion.ts
 *
 * Predicts what the user is likely to type next based on conversation context.
 * Shown as a ghost text suggestion in the PromptInput.
 *
 * CC uses runForkedAgent (complex cache-sharing mechanism).
 * QiLing adaptation: direct provider.stream() call with small token budget.
 * Disabled by default (QILING_PROMPT_SUGGESTION=1 to enable).
 */

import type { Message } from '../../types/message'
import type { Provider } from '../../types/provider'

// ─── Feature gate ─────────────────────────────────────────────────────────────

export function shouldEnablePromptSuggestion(): boolean {
  return process.env.QILING_PROMPT_SUGGESTION === '1'
}

// ─── Active request management ─────────────────────────────────────────────────

let _currentAbortController: AbortController | null = null

export function abortPromptSuggestion(): void {
  if (_currentAbortController) {
    _currentAbortController.abort()
    _currentAbortController = null
  }
}

// ─── Context extraction ───────────────────────────────────────────────────────

function buildSuggestionContext(messages: Message[]): string {
  const recent = messages
    .filter(m =>
      (m.role === 'user' || m.role === 'assistant') &&
      !(m as { isMeta?: boolean }).isMeta
    )
    .slice(-8)

  return recent
    .map(m => {
      const role = m.role === 'user' ? 'Human' : 'Assistant'
      const text = typeof m.content === 'string'
        ? m.content
        : Array.isArray(m.content)
          ? m.content.filter((b): b is { type: 'text'; text: string } => b.type === 'text').map(b => b.text).join(' ')
          : ''
      return `${role}: ${text.slice(0, 200)}`
    })
    .join('\n')
}

const SUGGESTION_SYSTEM = `You predict what the user will type next in a coding assistant conversation.
Output ONLY the predicted message, nothing else.
Keep it under 100 words. Be specific to the conversation context.
If unsure, output an empty string.`

// ─── Main API ─────────────────────────────────────────────────────────────────

/**
 * Generate a prompt suggestion based on conversation history.
 * Returns null if feature is disabled, aborted, or prediction confidence is low.
 *
 * Fire-and-forget: call this after each turn, abort the previous call first.
 */
export async function generatePromptSuggestion(
  messages: Message[],
  provider: Provider,
): Promise<string | null> {
  if (!shouldEnablePromptSuggestion()) return null
  if (messages.length < 4) return null  // Need enough context

  abortPromptSuggestion()
  const controller = new AbortController()
  _currentAbortController = controller

  const context = buildSuggestionContext(messages)
  if (!context.trim()) return null

  try {
    const stream = provider.stream(
      [{ role: 'user', content: `${context}\n\nPredict the user's next message:` }],
      [],
      {
        systemPrompt: SUGGESTION_SYSTEM,
        maxTokens: 80,
      }
    )

    let suggestion = ''
    for await (const chunk of stream) {
      if (controller.signal.aborted) return null
      if (chunk.type === 'text_delta') suggestion += chunk.text
      if (chunk.type === 'stop') break
    }

    const trimmed = suggestion.trim()
    // Don't suggest if too short or looks like a refusal
    if (trimmed.length < 5 || trimmed.toLowerCase().includes('cannot predict')) return null
    return trimmed
  } catch {
    return null
  } finally {
    if (_currentAbortController === controller) _currentAbortController = null
  }
}
