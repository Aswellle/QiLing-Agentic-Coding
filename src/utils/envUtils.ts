/**
 * Environment variable utilities — ported from CC's utils/envUtils.ts (core subset)
 *
 * isEnvTruthy(): 1/true/yes/on → true
 * isEnvDefinedFalsy(): 0/false/no/off → true (opposite of truthy, but defined)
 * parseEnvVars(): parse KEY=VALUE strings
 */

/** Returns true for "1", "true", "yes", "on" (case-insensitive). */
export function isEnvTruthy(envVar: string | boolean | undefined): boolean {
  if (!envVar) return false
  if (typeof envVar === 'boolean') return envVar
  return ['1', 'true', 'yes', 'on'].includes(envVar.toLowerCase().trim())
}

/** Returns true for "0", "false", "no", "off" (explicitly disabled). */
export function isEnvDefinedFalsy(envVar: string | boolean | undefined): boolean {
  if (envVar === undefined) return false
  if (typeof envVar === 'boolean') return !envVar
  if (!envVar) return false
  return ['0', 'false', 'no', 'off'].includes(envVar.toLowerCase().trim())
}

/** Parse KEY=VALUE strings into a Record. */
export function parseEnvVars(rawEnvArgs: string[] | undefined): Record<string, string> {
  const result: Record<string, string> = {}
  if (!rawEnvArgs) return result
  for (const envStr of rawEnvArgs) {
    const eqIdx = envStr.indexOf('=')
    if (eqIdx > 0) {
      result[envStr.slice(0, eqIdx)] = envStr.slice(eqIdx + 1)
    }
  }
  return result
}

/** Check if running in "bare" mode (skip non-essential features). */
export function isBareMode(): boolean {
  return isEnvTruthy(process.env.QILING_BARE) || process.argv.includes('--bare')
}
