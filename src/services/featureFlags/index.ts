/**
 * Feature Flags Service — replaces CC's GrowthBook/Statsig infrastructure
 *
 * CC uses GrowthBook (remote feature flags with A/B testing) and Statsig
 * for runtime feature gating. QiLing uses a simpler local config-file
 * approach that provides the same API without requiring external services.
 *
 * Flag resolution priority (highest first):
 *   1. Environment variable: QILING_FLAG_<NAME>=1/0/true/false/"value"
 *   2. Local config: ~/.qiling/flags.json
 *   3. Project config: .qiling/flags.json
 *   4. Default value passed to getFeatureValue()
 *
 * This replaces CC's:
 *   - getFeatureValue_CACHED_MAY_BE_STALE<T>(flag, default)
 *   - checkStatsigFeatureGate_CACHED_MAY_BE_STALE(flag)
 *   - getDynamicConfig_CACHED_MAY_BE_STALE<T>(flag, default)
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

// ─── Types ────────────────────────────────────────────────────────────────────

type FlagValue = boolean | string | number | Record<string, unknown>
type FlagsConfig = Record<string, FlagValue>

// ─── Config loading ───────────────────────────────────────────────────────────

let _cache: FlagsConfig | null = null
let _lastLoad = 0
const CACHE_TTL_MS = 30_000  // 30s — refresh periodically without blocking

function loadFlagsConfig(cwd = process.cwd()): FlagsConfig {
  const now = Date.now()
  if (_cache && now - _lastLoad < CACHE_TTL_MS) return _cache

  const merged: FlagsConfig = {}

  // User-level flags
  const userPath = join(homedir(), '.qiling', 'flags.json')
  if (existsSync(userPath)) {
    try {
      const raw = JSON.parse(readFileSync(userPath, 'utf-8')) as FlagsConfig
      Object.assign(merged, raw)
    } catch { /* ignore */ }
  }

  // Project-level flags (override user)
  const projectPath = join(cwd, '.qiling', 'flags.json')
  if (existsSync(projectPath)) {
    try {
      const raw = JSON.parse(readFileSync(projectPath, 'utf-8')) as FlagsConfig
      Object.assign(merged, raw)
    } catch { /* ignore */ }
  }

  _cache = merged
  _lastLoad = now
  return merged
}

/** Force a cache refresh on next call */
export function refreshFlagsCache(): void {
  _cache = null
  _lastLoad = 0
}

// ─── Environment override ─────────────────────────────────────────────────────

function getEnvOverride(flagName: string): FlagValue | undefined {
  // Convert flag name to env var: camelCase → SCREAMING_SNAKE_CASE
  const envKey = `QILING_FLAG_${flagName.replace(/([A-Z])/g, '_$1').toUpperCase()}`
  const val = process.env[envKey]
  if (val === undefined) return undefined
  if (val === '1' || val === 'true') return true
  if (val === '0' || val === 'false') return false
  try { return JSON.parse(val) } catch { return val }
}

// ─── Core API (CC-compatible interface) ───────────────────────────────────────

/**
 * Get a feature flag value. Equivalent to CC's getFeatureValue_CACHED_MAY_BE_STALE().
 *
 * @param flagName The feature flag name (camelCase)
 * @param defaultValue Fallback if flag not configured
 * @returns The flag value
 */
export function getFeatureValue_CACHED_MAY_BE_STALE<T>(
  flagName: string,
  defaultValue: T,
  cwd = process.cwd(),
): T {
  // 1. Environment override
  const envVal = getEnvOverride(flagName)
  if (envVal !== undefined) return envVal as unknown as T

  // 2. Config file
  const config = loadFlagsConfig(cwd)
  if (flagName in config) return config[flagName] as unknown as T

  return defaultValue
}

/**
 * Check a boolean feature gate. Equivalent to CC's checkStatsigFeatureGate_CACHED_MAY_BE_STALE().
 *
 * @param gateName The gate name
 * @returns true if the gate is enabled
 */
export function checkStatsigFeatureGate_CACHED_MAY_BE_STALE(
  gateName: string,
  cwd = process.cwd(),
): boolean {
  const val = getFeatureValue_CACHED_MAY_BE_STALE<boolean | string | number>(gateName, false, cwd)
  return val === true || val === 1 || val === '1' || val === 'true'
}

/**
 * Get a dynamic config (object-typed flag). Equivalent to CC's getDynamicConfig_CACHED_MAY_BE_STALE().
 */
export function getDynamicConfig_CACHED_MAY_BE_STALE<T extends Record<string, unknown>>(
  configName: string,
  defaultValue: T,
  cwd = process.cwd(),
): T {
  return getFeatureValue_CACHED_MAY_BE_STALE(configName, defaultValue, cwd)
}

/**
 * Same as getFeatureValue_CACHED_MAY_BE_STALE — QiLing reads from disk, so
 * both "cached" and "with refresh" return the same value.
 */
export const getFeatureValue_CACHED_WITH_REFRESH = getFeatureValue_CACHED_MAY_BE_STALE

// ─── Convenience helpers ──────────────────────────────────────────────────────

/**
 * Check if a flag is explicitly set (either in env or config).
 */
export function isFlagSet(flagName: string, cwd = process.cwd()): boolean {
  if (getEnvOverride(flagName) !== undefined) return true
  const config = loadFlagsConfig(cwd)
  return flagName in config
}

/**
 * Get all currently active flags (env + config merged).
 */
export function getAllActiveFlags(cwd = process.cwd()): Record<string, FlagValue> {
  return loadFlagsConfig(cwd)
}

/**
 * Programmatically set a flag in memory (useful for testing).
 */
export function setFlagOverride(flagName: string, value: FlagValue): void {
  if (!_cache) _cache = {}
  _cache[flagName] = value
}

/**
 * Clear all overrides set via setFlagOverride().
 */
export function clearFlagOverrides(): void {
  _cache = null
  _lastLoad = 0
}
