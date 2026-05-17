/**
 * Permission explainer — ported from CC's utils/permissions/permissionExplainer.ts
 *
 * Uses the configured AI provider (smallest/fastest model) to explain what a
 * shell command does, why it's being run, and its potential risk level.
 * Displayed in the permission dialog to help users make informed decisions.
 *
 * Disabled by default; enable via:
 *   QILING_PERMISSION_EXPLAINER=1 in environment, or
 *   settings.permissionExplainer = true
 */

import { z } from 'zod'
import type { Message } from '../types/message'
import type { Provider } from '../types/provider'

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export type PermissionExplanation = {
  riskLevel: RiskLevel
  explanation: string   // What the command does (1-2 sentences)
  reasoning: string     // Why the AI is running it (starts with "I")
  risk: string          // Potential risks (1 sentence)
}

type GenerateExplanationParams = {
  toolName: string
  toolInput: unknown
  toolDescription?: string
  messages?: Message[]
  provider: Provider
  signal: AbortSignal
}

// ─── Feature gate ─────────────────────────────────────────────────────────────

export function isPermissionExplainerEnabled(): boolean {
  return process.env.QILING_PERMISSION_EXPLAINER === '1'
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a security-conscious assistant helping users understand shell commands before they approve or deny them.

Analyze the command and provide:
1. A clear 1-2 sentence explanation of what it does
2. Why the AI is running it (based on conversation context), starting with "I"
3. Potential risks (file modifications, network access, system changes, data loss)
4. A risk level: LOW (read-only, safe), MEDIUM (writes files, installs packages), HIGH (system changes, network, dangerous patterns)

Be concise and specific. Focus on what matters to the user's decision.`

// ─── Context extraction ───────────────────────────────────────────────────────

function extractConversationContext(messages: Message[]): string {
  const recent = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-6)  // Last 3 exchanges
    .map(m => {
      const role = m.role === 'user' ? 'User' : 'Assistant'
      const content = typeof m.content === 'string'
        ? m.content
        : Array.isArray(m.content)
          ? m.content.filter((b): b is { type: 'text'; text: string } => b.type === 'text')
              .map(b => b.text).join(' ')
          : ''
      return `${role}: ${content.slice(0, 300)}`
    })
  return recent.join('\n')
}

function formatToolInput(input: unknown): string {
  if (typeof input === 'string') return input
  if (typeof input === 'object' && input !== null) {
    const obj = input as Record<string, unknown>
    // Show command prominently
    if (typeof obj.command === 'string') return `command: ${obj.command}`
    if (typeof obj.file_path === 'string') {
      return `file: ${obj.file_path}${typeof obj.content === 'string' ? ` (${obj.content.length} chars)` : ''}`
    }
    return JSON.stringify(input, null, 2).slice(0, 500)
  }
  return String(input)
}

// ─── Schema for structured output ─────────────────────────────────────────────

const RiskAssessmentSchema = z.object({
  explanation: z.string(),
  reasoning: z.string(),
  risk: z.string(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
})

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Generate an AI-powered explanation of a tool call for the permission dialog.
 *
 * Returns null if:
 *   - The feature is disabled
 *   - The provider call fails or times out
 *   - The signal is aborted
 */
export async function generatePermissionExplanation({
  toolName,
  toolInput,
  toolDescription,
  messages,
  provider,
  signal,
}: GenerateExplanationParams): Promise<PermissionExplanation | null> {
  if (!isPermissionExplainerEnabled()) return null
  if (signal.aborted) return null

  const formattedInput = formatToolInput(toolInput)
  const conversationContext = messages?.length ? extractConversationContext(messages) : ''

  const userPrompt = [
    `Tool: ${toolName}`,
    toolDescription ? `Description: ${toolDescription}` : '',
    `Input:\n${formattedInput}`,
    conversationContext ? `\nRecent conversation:\n${conversationContext}` : '',
    '\nExplain what this command does and assess its risk. Respond ONLY with valid JSON matching this schema:',
    '{"explanation":"...","reasoning":"I need to...","risk":"...","riskLevel":"LOW|MEDIUM|HIGH"}',
  ].filter(Boolean).join('\n')

  try {
    // Use provider.stream() with a very small token budget
    const stream = provider.stream(
      [{ role: 'user', content: userPrompt }],
      [],
      { systemPrompt: SYSTEM_PROMPT, maxTokens: 300 }
    )

    let responseText = ''
    for await (const chunk of stream) {
      if (signal.aborted) return null
      if (chunk.type === 'text_delta') responseText += chunk.text
      if (chunk.type === 'stop') break
    }

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = RiskAssessmentSchema.safeParse(JSON.parse(jsonMatch[0]))
    if (!parsed.success) return null

    return {
      riskLevel: parsed.data.riskLevel,
      explanation: parsed.data.explanation,
      reasoning: parsed.data.reasoning,
      risk: parsed.data.risk,
    }
  } catch {
    return null
  }
}
