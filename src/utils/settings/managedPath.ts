/**
 * Managed settings path — adapted from CC's utils/settings/managedPath.ts
 *
 * Returns platform-appropriate paths for enterprise-managed settings.
 * QiLing uses ~/.qiling/managed-settings.json by default, with
 * QILING_MANAGED_SETTINGS_PATH for override.
 *
 * CC: /Library/Application Support/ClaudeCode (macOS)
 *     C:\Program Files\ClaudeCode (Windows)
 *     /etc/claude-code (Linux)
 *
 * QiLing: same paths with QiLing names, or QILING_MANAGED_SETTINGS_PATH override
 */

import { join } from 'node:path'
import { homedir } from 'node:os'

let _cachedPath: string | undefined

/**
 * Get the managed settings directory path.
 * MDM/enterprise admins place managed-settings.json here.
 */
export function getManagedFilePath(): string {
  if (_cachedPath) return _cachedPath

  // FROM CC: ant-internal override (higher priority than product-specific env var)
  if (process.env.USER_TYPE === 'ant' && process.env.CLAUDE_CODE_MANAGED_SETTINGS_PATH) { // NAME: CLAUDE_CODE_MANAGED_SETTINGS_PATH
    _cachedPath = process.env.CLAUDE_CODE_MANAGED_SETTINGS_PATH
    return _cachedPath
  }

  if (process.env.QILING_MANAGED_SETTINGS_PATH) {
    _cachedPath = process.env.QILING_MANAGED_SETTINGS_PATH
    return _cachedPath
  }

  switch (process.platform) {
    case 'darwin':
      _cachedPath = '/Library/Application Support/QiLing'
      break
    case 'win32':
      _cachedPath = 'C:\\Program Files\\QiLing'
      break
    default:
      _cachedPath = '/etc/qiling'
  }

  return _cachedPath
}

/**
 * Get the managed-settings.d/ drop-in directory.
 * Files in this directory are merged alphabetically on top of managed-settings.json.
 * Later files override earlier files.
 */
export function getManagedSettingsDropInDir(): string {
  return join(getManagedFilePath(), 'managed-settings.d')
}

/** @internal — reset cached path for tests */
export function _resetManagedPathForTesting(): void {
  _cachedPath = undefined
}
