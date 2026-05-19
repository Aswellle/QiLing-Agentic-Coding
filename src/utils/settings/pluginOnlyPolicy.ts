/**
 * Plugin-only policy checks — adapted from CC's utils/settings/pluginOnlyPolicy.ts
 *
 * When an organization sets `strictPluginOnlyCustomization` in managed settings,
 * user-level and project-level customizations are blocked and only plugin-provided
 * and managed sources are allowed.
 *
 * QiLing: reads from QILING_PLUGIN_ONLY_POLICY env var or managed settings.
 */

const ADMIN_TRUSTED_SOURCES: ReadonlySet<string> = new Set([
  'plugin',
  'policySettings',
  'built-in',
  'builtin',
  'bundled',
])

export type CustomizationSurface =
  | 'commands'
  | 'hooks'
  | 'output-styles'
  | 'agents'

/**
 * Check whether a customization surface is locked to plugin-only sources.
 * Returns true if QILING_PLUGIN_ONLY_POLICY env var is set.
 */
export function isRestrictedToPluginOnly(
  surface: CustomizationSurface,
): boolean {
  const policy = process.env.QILING_PLUGIN_ONLY_POLICY
  if (!policy) return false
  if (policy === '1' || policy === 'true' || policy === 'all') return true
  // Comma-separated list of surfaces
  return policy.split(',').map(s => s.trim()).includes(surface)
}

/**
 * Whether a customization source is admin-trusted (bypasses plugin-only policy).
 */
export function isSourceAdminTrusted(source: string | undefined): boolean {
  return source !== undefined && ADMIN_TRUSTED_SOURCES.has(source)
}
