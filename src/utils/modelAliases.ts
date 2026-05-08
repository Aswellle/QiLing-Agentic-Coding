/**
 * Model alias utilities — ported from CC's utils/model/aliases.ts
 *
 * Allows users to specify 'sonnet', 'opus', 'haiku' instead of full model IDs.
 * QiLing extends this with Chinese AI provider model families.
 */

export const MODEL_ALIASES = [
  // Anthropic families
  'sonnet', 'opus', 'haiku',
  // QiLing-specific aliases
  'minimax', 'qwen', 'doubao', 'glm',
] as const

export type ModelAlias = (typeof MODEL_ALIASES)[number]

export function isModelAlias(modelInput: string): modelInput is ModelAlias {
  return MODEL_ALIASES.includes(modelInput as ModelAlias)
}

/** Map alias to latest default model ID */
export const MODEL_ALIAS_MAP: Record<string, string> = {
  // Anthropic
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-7',
  haiku: 'claude-haiku-4-5-20251001',
  // Chinese providers
  minimax: 'MiniMax-Text-01',
  qwen: 'qwen-plus',
  doubao: 'doubao-1-5-pro-256k',
  glm: 'glm-4-plus',
}

export function resolveModelAlias(input: string): string {
  return MODEL_ALIAS_MAP[input.toLowerCase()] ?? input
}

export const MODEL_FAMILY_ALIASES = ['sonnet', 'opus', 'haiku'] as const

export function isModelFamilyAlias(model: string): boolean {
  return (MODEL_FAMILY_ALIASES as readonly string[]).includes(model)
}
