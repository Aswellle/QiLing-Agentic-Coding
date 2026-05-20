/**
 * Managed plugin names — adapted from CC's utils/plugins/managedPlugins.ts
 *
 * Returns plugin names locked by org policy (policySettings.enabledPlugins).
 * In QiLing: stub returning null (no managed settings in OSS builds).
 */

export function getManagedPluginNames(): Set<string> | null {
  // QiLing: no policy settings support yet
  return null
}
