/**
 * Plugin identifier utilities — adapted from CC's utils/plugins/pluginIdentifier.ts
 *
 * Parses and builds plugin ID strings in "name@marketplace" format.
 * Supports plugin scope tracking (user/project/local/flag).
 */

export type ExtendedPluginScope = 'user' | 'project' | 'local' | 'managed' | 'flag'
export type PersistablePluginScope = Exclude<ExtendedPluginScope, 'flag'>

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
