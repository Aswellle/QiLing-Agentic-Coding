/**
 * Model capability overrides for 3rd-party providers — adapted from CC's utils/model/modelSupportOverrides.ts
 *
 * When using Bedrock/Vertex/Foundry, some model aliases (e.g., ANTHROPIC_DEFAULT_SONNET_MODEL)
 * may not support all capabilities. This module reads capability overrides from env vars.
 *
 * @example
 * ANTHROPIC_DEFAULT_SONNET_MODEL=my-custom-sonnet
 * ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES=thinking,effort
 */

import { getAPIProvider } from './providers.js'

export type ModelCapabilityOverride =
  | 'effort'
  | 'max_effort'
  | 'thinking'
  | 'adaptive_thinking'
  | 'interleaved_thinking'

const TIERS = [
  {
    modelEnvVar: 'ANTHROPIC_DEFAULT_OPUS_MODEL',
    capabilitiesEnvVar: 'ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES',
  },
  {
    modelEnvVar: 'ANTHROPIC_DEFAULT_SONNET_MODEL',
    capabilitiesEnvVar: 'ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES',
  },
  {
    modelEnvVar: 'ANTHROPIC_DEFAULT_HAIKU_MODEL',
    capabilitiesEnvVar: 'ANTHROPIC_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES',
  },
] as const

const _cache = new Map<string, boolean | undefined>()

/**
 * Check if a 3rd-party model (via env var alias) supports a specific capability.
 * Returns undefined for first-party Anthropic API (use modelSupportsThinking etc. instead).
 */
export function get3PModelCapabilityOverride(
  model: string,
  capability: ModelCapabilityOverride,
): boolean | undefined {
  const key = `${model.toLowerCase()}:${capability}`
  if (_cache.has(key)) return _cache.get(key)

  if (getAPIProvider() === 'firstParty') {
    _cache.set(key, undefined)
    return undefined
  }

  const m = model.toLowerCase()
  for (const tier of TIERS) {
    const pinned = process.env[tier.modelEnvVar]
    const capabilities = process.env[tier.capabilitiesEnvVar]
    if (!pinned || capabilities === undefined) continue
    if (m !== pinned.toLowerCase()) continue

    const result = capabilities
      .toLowerCase()
      .split(',')
      .map(s => s.trim())
      .includes(capability)
    _cache.set(key, result)
    return result
  }

  _cache.set(key, undefined)
  return undefined
}
