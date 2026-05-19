/**
 * Session name generation — adapted from CC's commands/rename/generateSessionName.ts
 *
 * Uses a lightweight AI query to generate a short kebab-case session name
 * based on the conversation content.
 */

import type { Message } from '../../types/message.js'
import type { Provider } from '../../types/provider.js'
import { logForDebugging } from '../../utils/log.js'
import { errorMessage } from '../../utils/errors.js'
import { extractConversationText } from '../../utils/sessionTitle.js'
import { sideQuery } from '../../utils/sideQuery.js'

const SYSTEM_PROMPT = `Generate a short kebab-case name (2-4 words) that captures the main topic of this conversation. Use lowercase words separated by hyphens. Examples: "fix-login-bug", "add-auth-feature", "refactor-api-client", "debug-test-failures". Return ONLY the name, nothing else.`

/**
 * Generate a short kebab-case session name based on conversation content.
 * Returns null if the conversation is too short or generation fails.
 *
 * @param provider  AI provider to use for generation
 * @param messages  Conversation messages to analyze
 * @param signal    Optional abort signal
 */
export async function generateSessionName(
  provider: Provider,
  messages: Message[],
  signal?: AbortSignal,
): Promise<string | null> {
  const conversationText = extractConversationText(messages)
  if (!conversationText) return null

  try {
    const { text } = await sideQuery(provider, {
      system: SYSTEM_PROMPT,
      userPrompt: conversationText.slice(0, 2000),
      maxTokens: 32,
      signal,
    })

    if (!text) return null

    // Clean up to ensure it's valid kebab-case
    const name = text.trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50)

    return name || null
  } catch (error) {
    logForDebugging(`generateSessionName failed: ${errorMessage(error)}`, { level: 'error' })
    return null
  }
}
