/**
 * Agent display utilities — adapted from CC's components/agents/utils.ts
 *
 * getAgentSourceDisplayName: human-readable label for agent source.
 */

import capitalize from 'lodash-es/capitalize.js'

export type SettingSource = 'userSettings' | 'projectSettings' | 'localSettings' | 'policySettings' | 'flagSettings'

function getSettingSourceName(source: SettingSource): string {
  switch (source) {
    case 'userSettings': return 'user'
    case 'projectSettings': return 'project'
    case 'localSettings': return 'local'
    case 'policySettings': return 'policy'
    case 'flagSettings': return 'flag'
  }
}

export function getAgentSourceDisplayName(source: SettingSource | 'all' | 'built-in' | 'plugin'): string {
  if (source === 'all') return 'Agents'
  if (source === 'built-in') return 'Built-in agents'
  if (source === 'plugin') return 'Plugin agents'
  return capitalize(getSettingSourceName(source as SettingSource))
}
