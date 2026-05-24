/**
 * Fallback storage — adapted from CC's utils/secureStorage/fallbackStorage.ts
 *
 * Wraps two SecureStorage implementations with primary-first fallback.
 * Migrates from secondary to primary on first successful primary write.
 */

import type { SecureStorage, SecureStorageData } from './types.js'

export function createFallbackStorage(primary: SecureStorage, secondary: SecureStorage): SecureStorage {
  return {
    name: `${primary.name}-with-${secondary.name}-fallback`,

    read(): SecureStorageData {
      const result = primary.read()
      if (result !== null && result !== undefined) return result
      return secondary.read() || {}
    },

    async readAsync(): Promise<SecureStorageData | null> {
      const result = await primary.readAsync()
      if (result !== null && result !== undefined) return result
      return (await secondary.readAsync()) || {}
    },

    update(data: SecureStorageData): { success: boolean; warning?: string } {
      const primaryDataBefore = primary.read()
      const result = primary.update(data)
      if (result.success) {
        if (primaryDataBefore === null) secondary.delete()
        return result
      }

      const fallbackResult = secondary.update(data)
      if (fallbackResult.success) {
        if (primaryDataBefore !== null) primary.delete()
        return { success: true, warning: fallbackResult.warning }
      }

      return { success: false }
    },

    delete(): boolean {
      // FROM CC: explicitly delete both — short-circuit would leave stale
      // primary entries that shadow fresh secondary writes (#30337)
      const primarySuccess = primary.delete()
      const secondarySuccess = secondary.delete()
      return primarySuccess || secondarySuccess
    },
  }
}
