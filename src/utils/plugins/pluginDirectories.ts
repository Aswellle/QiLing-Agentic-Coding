/**
 * Plugin directory configuration — adapted from CC's utils/plugins/pluginDirectories.ts
 *
 * Provides the source of truth for plugin directory paths.
 * Supports CLAUDE_CODE_PLUGIN_CACHE_DIR override and cowork mode.
 */

import { mkdirSync } from 'fs'
import { readdir, rm, stat } from 'fs/promises'
import { delimiter, join } from 'path'
import { homedir } from 'os'
import { logForDebugging } from '../log.js'
import { isEnvTruthy } from '../envUtils.js'
import { errorMessage, isFsInaccessible } from '../errors.js'
import { formatFileSize } from '../format.js'

const PLUGINS_DIR = 'plugins'
const COWORK_PLUGINS_DIR = 'cowork_plugins'

function getConfigHomeDir(): string {
  return process.env.CLAUDE_CODE_CONFIG_DIR || join(homedir(), '.qiling')
}

function getPluginsDirectoryName(): string {
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_COWORK_PLUGINS)) return COWORK_PLUGINS_DIR
  return PLUGINS_DIR
}

export function getPluginsDirectory(): string {
  const envOverride = process.env.CLAUDE_CODE_PLUGIN_CACHE_DIR
  if (envOverride) {
    // Expand ~ manually
    return envOverride.startsWith('~/') ? join(homedir(), envOverride.slice(2)) : envOverride
  }
  return join(getConfigHomeDir(), getPluginsDirectoryName())
}

export function getPluginSeedDirs(): string[] {
  const raw = process.env.CLAUDE_CODE_PLUGIN_SEED_DIR
  if (!raw) return []
  return raw.split(delimiter).filter(Boolean).map(p => p.startsWith('~/') ? join(homedir(), p.slice(2)) : p)
}

function sanitizePluginId(pluginId: string): string {
  return pluginId.replace(/[^a-zA-Z0-9\-_]/g, '-')
}

export function pluginDataDirPath(pluginId: string): string {
  return join(getPluginsDirectory(), 'data', sanitizePluginId(pluginId))
}

export function getPluginDataDir(pluginId: string): string {
  const dir = pluginDataDirPath(pluginId)
  mkdirSync(dir, { recursive: true })
  return dir
}

export async function getPluginDataDirSize(pluginId: string): Promise<{ bytes: number; human: string } | null> {
  const dir = pluginDataDirPath(pluginId)
  let bytes = 0
  const walk = async (p: string) => {
    for (const entry of await readdir(p, { withFileTypes: true })) {
      const full = join(p, entry.name)
      if (entry.isDirectory()) await walk(full)
      else { try { bytes += (await stat(full)).size } catch {} }
    }
  }
  try { await walk(dir) } catch (e) { if (isFsInaccessible(e)) return null; throw e }
  if (bytes === 0) return null
  return { bytes, human: formatFileSize(bytes) }
}

export async function deletePluginDataDir(pluginId: string): Promise<void> {
  const dir = pluginDataDirPath(pluginId)
  try { await rm(dir, { recursive: true, force: true }) }
  catch (e) { logForDebugging(`Failed to delete plugin data dir ${dir}: ${errorMessage(e)}`) }
}
