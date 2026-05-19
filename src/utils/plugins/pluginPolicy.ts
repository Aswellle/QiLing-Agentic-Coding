/**
 * Plugin policy checks — adapted from CC's utils/plugins/pluginPolicy.ts
 *
 * Leaf module (only imports settings) to avoid circular dependencies.
 * Checks if a plugin is blocked by organization policy (managed-settings.json).
 *
 * QiLing: reads from QILING_BLOCKED_PLUGINS env var (comma-separated plugin IDs)
 * as a simple alternative to the full CC managed-settings system.
 */

let _blockedPlugins: Set<string> | undefined

function getBlockedPlugins(): Set<string> {
  if (_blockedPlugins) return _blockedPlugins
  const envVal = process.env.QILING_BLOCKED_PLUGINS ?? ''
  _blockedPlugins = new Set(
    envVal.split(',').map(s => s.trim()).filter(Boolean)
  )
  return _blockedPlugins
}

/**
 * Check if a plugin is force-disabled by org policy.
 * Policy-blocked plugins cannot be installed or enabled by the user at any scope.
 *
 * QiLing: set QILING_BLOCKED_PLUGINS="plugin-id-1,plugin-id-2" to block plugins.
 */
export function isPluginBlockedByPolicy(pluginId: string): boolean {
  return getBlockedPlugins().has(pluginId)
}

/** @internal — reset for tests */
export function _resetPluginPolicyCacheForTesting(): void {
  _blockedPlugins = undefined
}
