/**
 * Dynamic config hook — adapted from CC's hooks/useDynamicConfig.ts
 *
 * Returns defaultValue immediately, updates when remote config is fetched.
 * In QiLing: reads from QILING_FLAG_<NAME> env or .qiling/flags.json (featureFlags).
 */

import React from 'react'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '../services/featureFlags/index.js'

export function useDynamicConfig<T>(configName: string, defaultValue: T): T {
  const [configValue, setConfigValue] = React.useState<T>(defaultValue)

  React.useEffect(() => {
    if (process.env.NODE_ENV === 'test') return
    // Read from QiLing feature flags (env var or .qiling/flags.json)
    const value = getFeatureValue_CACHED_MAY_BE_STALE<T>(configName, defaultValue)
    setConfigValue(value)
  }, [configName, defaultValue])

  return configValue
}
