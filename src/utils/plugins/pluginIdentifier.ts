/**
 * Plugin identifier utilities — adapted from CC's utils/plugins/pluginIdentifier.ts
 *
 * Parses and builds plugin ID strings in "name@marketplace" format.
 * Supports plugin scope tracking (user/project/local/flag).
 */

export type PluginScope = 'user' | 'project' | 'local' | 'managed'
export type ExtendedPluginScope = PluginScope | 'flag'
export type PersistablePluginScope = Exclude<ExtendedPluginScope, 'flag'>

// FROM CC: SettingSource / EditableSettingSource — inline (settings/constants.ts MISSING)
type SettingSource = 'policySettings' | 'userSettings' | 'projectSettings' | 'localSettings' | 'flagSettings'
type EditableSettingSource = 'userSettings' | 'projectSettings' | 'localSettings'

export type ParsedPluginIdentifier = {
  name: string
  marketplace?: string
}

export function parsePluginIdentifier(plugin: string): ParsedPluginIdentifier {
  if (plugin.includes('@')) {
    const parts = plugin.split('@')
    return { name: parts[0] || '', marketplace: parts[1] }
  }
  return { name: plugin }
}

export function buildPluginId(name: string, marketplace?: string): string {
  return marketplace ? `${name}@${marketplace}` : name
}

// Anthropic-controlled marketplace names — safe to log in general telemetry
const ALLOWED_OFFICIAL_MARKETPLACE_NAMES = new Set(['anthropic', 'claude'])

export function isOfficialMarketplaceName(marketplace: string | undefined): boolean {
  return marketplace !== undefined && ALLOWED_OFFICIAL_MARKETPLACE_NAMES.has(marketplace.toLowerCase())
}

// FROM CC: SETTING_SOURCE_TO_SCOPE — map setting source → plugin scope (including flag session-only)
export const SETTING_SOURCE_TO_SCOPE = {
  policySettings: 'managed',
  userSettings: 'user',
  projectSettings: 'project',
  localSettings: 'local',
  flagSettings: 'flag',
} as const satisfies Record<SettingSource, ExtendedPluginScope>

const SCOPE_TO_EDITABLE_SOURCE: Record<Exclude<PluginScope, 'managed'>, EditableSettingSource> = {
  user: 'userSettings',
  project: 'projectSettings',
  local: 'localSettings',
}

// FROM CC: scopeToSettingSource — convert installable plugin scope to editable setting source
export function scopeToSettingSource(scope: PluginScope): EditableSettingSource {
  if (scope === 'managed') throw new Error('Cannot install plugins to managed scope')
  return SCOPE_TO_EDITABLE_SOURCE[scope]
}

// FROM CC: settingSourceToScope — inverse of SETTING_SOURCE_TO_SCOPE for editable sources
export function settingSourceToScope(source: EditableSettingSource): Exclude<PluginScope, 'managed'> {
  return SETTING_SOURCE_TO_SCOPE[source] as Exclude<PluginScope, 'managed'>
}
