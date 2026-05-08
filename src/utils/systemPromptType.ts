/**
 * Branded system prompt type — ported from CC's utils/systemPromptType.ts (verbatim)
 * Dependency-free for safe circular-import avoidance.
 */
export type SystemPrompt = readonly string[] & { readonly __brand: 'SystemPrompt' }

export function asSystemPrompt(value: readonly string[]): SystemPrompt {
  return value as SystemPrompt
}
