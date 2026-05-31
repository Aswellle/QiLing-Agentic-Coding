// FROM CC: getFeatureValue_CACHED_MAY_BE_STALE — stub (no GrowthBook in QiLing)
const getFeatureValue_CACHED_MAY_BE_STALE = <T>(_key: string, def: T): T => def

/**
 * Whether inference-config commands (/model, /fast, /effort) should execute
 * immediately (during a running query) rather than waiting for the current
 * turn to finish.
 */
export function shouldInferenceConfigCommandBeImmediate(): boolean {
  return (
    process.env.USER_TYPE === 'ant' ||
    getFeatureValue_CACHED_MAY_BE_STALE('tengu_immediate_model_command', false)
  )
}
