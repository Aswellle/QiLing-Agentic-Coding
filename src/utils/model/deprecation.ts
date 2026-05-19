/**
 * Model deprecation utilities — adapted from CC's utils/model/deprecation.ts
 *
 * Tracks deprecated models and their retirement dates by provider.
 * Used by useDeprecationWarningNotification to alert users.
 */

import { type APIProvider, getAPIProvider } from './providers.js'

type DeprecationEntry = {
  modelName: string
  retirementDates: Record<APIProvider, string | null>
}

/**
 * Deprecated models and their retirement dates by provider.
 * Keys are substrings matched in model IDs (case-insensitive).
 */
const DEPRECATED_MODELS: Record<string, DeprecationEntry> = {
  'claude-3-opus': {
    modelName: 'Claude 3 Opus',
    retirementDates: {
      firstParty: 'January 5, 2026',
      bedrock: 'January 15, 2026',
      vertex: 'January 5, 2026',
      foundry: 'January 5, 2026',
    },
  },
  'claude-3-7-sonnet': {
    modelName: 'Claude 3.7 Sonnet',
    retirementDates: {
      firstParty: 'February 19, 2026',
      bedrock: 'April 28, 2026',
      vertex: 'May 11, 2026',
      foundry: 'February 19, 2026',
    },
  },
  'claude-3-5-haiku': {
    modelName: 'Claude 3.5 Haiku',
    retirementDates: {
      firstParty: 'February 19, 2026',
      bedrock: null,
      vertex: null,
      foundry: null,
    },
  },
}

function getDeprecatedModelInfo(
  modelId: string,
): { isDeprecated: true; modelName: string; retirementDate: string } | { isDeprecated: false } {
  const lower = modelId.toLowerCase()
  const provider = getAPIProvider()

  for (const [key, value] of Object.entries(DEPRECATED_MODELS)) {
    const retirementDate = value.retirementDates[provider]
    if (!lower.includes(key) || !retirementDate) continue
    return { isDeprecated: true, modelName: value.modelName, retirementDate }
  }

  return { isDeprecated: false }
}

/**
 * Get a deprecation warning message for a model, or null if not deprecated.
 * Returns localized warning string with retirement date.
 */
export function getModelDeprecationWarning(modelId: string | null): string | null {
  if (!modelId) return null
  const info = getDeprecatedModelInfo(modelId)
  if (!info.isDeprecated) return null
  return `⚠ ${info.modelName} 将于 ${info.retirementDate} 退役。请考虑切换到更新的模型。`
}
