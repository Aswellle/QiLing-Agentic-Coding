/**
 * SecureStorage types — adapted from CC's utils/secureStorage/types.ts
 *
 * Interface for platform-specific secure credential storage.
 * Implementations: macOS Keychain, plaintext fallback (~/.qiling/.credentials.json).
 */

export type SecureStorageData = Record<string, string>

export interface SecureStorage {
  readonly name: string
  read(): SecureStorageData | null
  readAsync(): Promise<SecureStorageData | null>
  update(data: SecureStorageData): { success: boolean; warning?: string }
  delete(): boolean
}
