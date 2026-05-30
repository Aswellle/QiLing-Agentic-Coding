// FROM CC: utils/model/modelOptions.ts (adapt-new stub)
// Full port blocked on circular dep (needs config.ts which needs this file).
// Only exports ModelOption type + minimal stubs; full implementation deferred.
export type ModelOption = {
  value: string
  label: string
  description: string
  descriptionForModel?: string
}

export function getDefaultOptionForUser(_fastMode = false): ModelOption {
  return {
    value: 'claude-sonnet-4-6',
    label: 'Default (Sonnet 4.6)',
    description: 'Claude Sonnet 4.6 — recommended for most tasks',
  }
}

export function getSonnet46_1MOption(): ModelOption {
  return {
    value: 'claude-sonnet-4-6-20251101',
    label: 'Claude Sonnet 4.6 (1M context)',
    description: 'Claude Sonnet 4.6 with extended 1M context window',
  }
}

export function getOpus46_1MOption(_fastMode = false): ModelOption {
  return {
    value: 'claude-opus-4-8',
    label: 'Claude Opus 4 (1M context)',
    description: 'Claude Opus 4 — most capable model',
  }
}
