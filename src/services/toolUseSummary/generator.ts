/**
 * Tool-use summary generator — ported from CC's services/toolUseSummary/toolUseSummaryGenerator.ts
 *
 * After each tool-execution round, calls the cheapest available model
 * (claude-haiku or equivalent) to generate a ~30-char summary like
 * "Read 3 files, ran tests" for display and context compression.
 */

import type { Provider } from '../../types/provider'
import type { ToolResultContent } from '../../types/message'

const SYSTEM_PROMPT =
  'Write a brief summary tag describing what these tool calls accomplished. ' +
  'Limit to ~30 characters (like a git commit subject). ' +
  'Keep verbs in past tense and the most distinctive nouns. ' +
  'Drop articles, conjunctions, and long path context.'

const MAX_INPUT_CHARS = 300
const MAX_CONTEXT_CHARS = 200

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max) + '…'
}

export interface ToolInfo {
  name: string
  input: unknown
  result?: string
}

/**
 * Generate a short summary of a set of tool calls.
 * Returns null on any error (non-blocking — caller continues without summary).
 */
export async function generateToolUseSummary(params: {
  tools: ToolInfo[]
  lastAssistantText?: string
  provider: Provider
  signal?: AbortSignal
}): Promise<string | null> {
  const { tools, lastAssistantText, provider, signal } = params

  if (tools.length === 0) return null

  const toolLines = tools.map(t => {
    const inputStr = truncate(JSON.stringify(t.input ?? {}), MAX_INPUT_CHARS)
    const resultStr = t.result ? ` → ${truncate(t.result, MAX_INPUT_CHARS)}` : ''
    return `${t.name}(${inputStr})${resultStr}`
  })

  const contextLine = lastAssistantText
    ? `\nContext: ${truncate(lastAssistantText, MAX_CONTEXT_CHARS)}`
    : ''

  const userContent = `Tools executed:\n${toolLines.join('\n')}${contextLine}`

  try {
    const stream = provider.stream(
      [{ role: 'user', content: userContent }],
      [],
      {
        systemPrompt: SYSTEM_PROMPT,
        maxTokens: 60,
      }
    )

    let summary = ''
    for await (const chunk of stream) {
      if (signal?.aborted) return null
      if (chunk.type === 'text_delta') summary += chunk.text
      if (chunk.type === 'stop') break
    }

    const cleaned = summary.trim().replace(/^["']|["']$/g, '')
    return cleaned || null
  } catch {
    return null  // non-critical — never crash the main query loop
  }
}

/**
 * Extract ToolInfo from completed tool results for passing to generateToolUseSummary.
 */
export function extractToolInfoFromResults(
  toolUses: Array<{ id: string; name: string; input: unknown }>,
  results: ToolResultContent[]
): ToolInfo[] {
  const resultMap = new Map(results.map(r => [r.tool_use_id, r.content]))
  return toolUses.map(tu => ({
    name: tu.name,
    input: tu.input,
    result: typeof resultMap.get(tu.id) === 'string'
      ? (resultMap.get(tu.id) as string).slice(0, 200)
      : undefined,
  }))
}
