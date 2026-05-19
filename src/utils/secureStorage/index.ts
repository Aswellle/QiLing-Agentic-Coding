/**
 * SecureStorage factory — adapted from CC's utils/secureStorage/index.ts
 *
 * Returns the platform-appropriate credential storage:
 * - macOS: macOS Keychain with plaintext fallback
 * - Linux/Windows: plaintext only (keychain support TBD)
 */

import { createFallbackStorage } from './fallbackStorage.js'
import { plainTextStorage } from './plainTextStorage.js'
import type { SecureStorage } from './types.js'

export type { SecureStorage, SecureStorageData } from './types.js'

export function getSecureStorage(): SecureStorage {
  if (process.platform === 'darwin') {
    try {
      // Lazy import macOS keychain — only available on macOS
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
      const { macOsKeychainStorage } = require('./macOsKeychainStorage.js') as any
      if (macOsKeychainStorage) return createFallbackStorage(macOsKeychainStorage, plainTextStorage)
    } catch {
      // Fall through to plaintext if keychain module not available
    }
  }
  return plainTextStorage
}
