/**
 * Side query utility — adapted from CC's utils/sideQuery.ts
 *
 * Makes lightweight AI queries outside the main conversation loop.
 * Used by: permissionExplainer, SessionMemory, MagicDocs, AgentSummary.
 *
 * CC uses a complex direct Anthropic API call with betas/caching/attribution.
 * QiLing adaptation: delegates to provider.stream() for portability.
 */

import type { Provider } from '../types/provider'

export type SideQueryOptions = {
  /** System prompt */
  system?: string
  /** User messages */
  userPrompt: string
  /** Max tokens (default: 256) */
  maxTokens?: number
  /** Abort signal */
  signal?: AbortSignal
}

export type SideQueryResult = {
  text: string
  stopped: boolean
}

/**
 * Run a lightweight AI query for background tasks.
 *
 * @param provider The provider to use
 * @param options Query options
 * @returns The model's text response
 */
export async function sideQuery(
  provider: Provider,
  options: SideQueryOptions,
): Promise<SideQueryResult> {
  const { system, userPrompt, maxTokens = 256, signal } = options

  if (signal?.aborted) {
    return { text: '', stopped: true }
  }

  try {
    const stream = provider.stream(
      [{ role: 'user', content: userPrompt }],
      [],
      { systemPrompt: system, maxTokens }
    )

    let text = ''
    let stopped = false

    for await (const chunk of stream) {
      if (signal?.aborted) return { text, stopped: true }
      if (chunk.type === 'text_delta') text += chunk.text
      if (chunk.type === 'stop') { stopped = true; break }
    }

    return { text: text.trim(), stopped }
  } catch {
    return { text: '', stopped: false }
  }
}

/**
 * Run a side query and extract JSON from the response.
 * Returns null if parsing fails.
 */
export async function sideQueryJSON<T>(
  provider: Provider,
  options: SideQueryOptions,
): Promise<T | null> {
  const { text } = await sideQuery(provider, options)
  if (!text) return null
  const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
  if (!jsonMatch) return null
  try {
    return JSON.parse(jsonMatch[0]) as T
  } catch {
    return null
  }
}
