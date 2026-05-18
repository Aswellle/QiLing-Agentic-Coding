/**
 * Environment variable validation — direct port of CC's utils/envValidation.ts
 *
 * Validates bounded integer environment variables with clamping and error messages.
 * Used by timeout/limit env vars (BASH_DEFAULT_TIMEOUT_MS, etc.).
 */

export type EnvVarValidationResult = {
  effective: number
  status: 'valid' | 'capped' | 'invalid'
  message?: string
}

/**
 * Parse and validate an integer environment variable within bounds.
 *
 * @param name Env var name (for error messages)
 * @param value The raw env var value (undefined if not set)
 * @param defaultValue Used when not set or invalid
 * @param upperLimit Maximum allowed value (capped if exceeded)
 */
export function validateBoundedIntEnvVar(
  name: string,
  value: string | undefined,
  defaultValue: number,
  upperLimit: number,
): EnvVarValidationResult {
  if (!value) {
    return { effective: defaultValue, status: 'valid' }
  }

  const parsed = parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return {
      effective: defaultValue,
      status: 'invalid',
      message: `Invalid value "${value}" (using default: ${defaultValue})`,
    }
  }

  if (parsed > upperLimit) {
    return {
      effective: upperLimit,
      status: 'capped',
      message: `Capped from ${parsed} to ${upperLimit}`,
    }
  }

  return { effective: parsed, status: 'valid' }
}

/**
 * Convenience wrapper: read an env var as bounded int with defaults.
 * Logs warnings for capped/invalid values when QILING_DEBUG=1.
 */
export function readBoundedIntEnv(
  name: string,
  defaultValue: number,
  upperLimit: number,
): number {
  const result = validateBoundedIntEnvVar(name, process.env[name], defaultValue, upperLimit)
  if (result.message && process.env.QILING_DEBUG === '1') {
    console.error(`[envValidation] ${name}: ${result.message}`)
  }
  return result.effective
}
