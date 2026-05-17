/**
 * Settings migration utilities — ported from CC's migrations/ pattern
 *
 * Handles model name updates and settings schema upgrades.
 * Run once at startup via runMigrations().
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

// ─── Model name aliases (old → new) ──────────────────────────────────────────

const MODEL_ALIASES: Record<string, string> = {
  // Sonnet 4.5 → 4.6
  'claude-sonnet-4-5': 'claude-sonnet-4-6',
  'claude-sonnet-4-5-20250929': 'claude-sonnet-4-6',
  // Opus 4.6 → 4.7
  'claude-opus-4-6': 'claude-opus-4-7',
  // Short aliases
  'claude-3-5-sonnet-20241022': 'claude-sonnet-4-6',
  'claude-3-opus-20240229': 'claude-opus-4-7',
}

// ─── Settings file helpers ────────────────────────────────────────────────────

function readSettingsFile(path: string): Record<string, unknown> | null {
  if (!existsSync(path)) return null
  try { return JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown> } catch { return null }
}

function writeSettingsFile(path: string, data: Record<string, unknown>): void {
  try { writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf-8') } catch { /* best-effort */ }
}

// ─── Individual migrations ────────────────────────────────────────────────────

/**
 * Migrate deprecated model names to current equivalents.
 * Only updates if the old model name is still referenced.
 */
function migrateModelNames(settingsPath: string): void {
  const settings = readSettingsFile(settingsPath)
  if (!settings) return

  const model = settings.model as string | undefined
  if (!model) return

  const newModel = MODEL_ALIASES[model]
  if (!newModel) return

  if (process.env.QILING_DEBUG === '1') {
    console.error(`[migration] Model rename: ${model} → ${newModel} in ${settingsPath}`)
  }

  writeSettingsFile(settingsPath, { ...settings, model: newModel })
}

/**
 * Migrate old 'ui.theme' values to new ones.
 */
function migrateThemeValues(settingsPath: string): void {
  const settings = readSettingsFile(settingsPath)
  if (!settings) return

  const ui = settings.ui as Record<string, unknown> | undefined
  if (!ui) return

  const THEME_RENAMES: Record<string, string> = {
    'solarized-dark': 'dark',
    'solarized-light': 'light',
    'monokai': 'dark',
  }

  const oldTheme = ui.theme as string | undefined
  if (!oldTheme || !THEME_RENAMES[oldTheme]) return

  writeSettingsFile(settingsPath, {
    ...settings,
    ui: { ...ui, theme: THEME_RENAMES[oldTheme] },
  })
}

// ─── Runner ───────────────────────────────────────────────────────────────────

let _hasMigrated = false

/**
 * Run all pending migrations at startup.
 * Idempotent — safe to call multiple times.
 */
export function runMigrations(workingDir: string): void {
  if (_hasMigrated) return
  _hasMigrated = true

  const settingsPaths = [
    join(homedir(), '.qiling', 'settings.json'),
    join(workingDir, '.qiling', 'settings.json'),
  ]

  for (const path of settingsPaths) {
    migrateModelNames(path)
    migrateThemeValues(path)
  }
}

/**
 * Check if a model name is deprecated and return the current equivalent.
 * Returns the original if not deprecated.
 */
export function resolveModelAlias(model: string): string {
  return MODEL_ALIASES[model] ?? model
}
