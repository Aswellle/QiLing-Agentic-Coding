/**
 * GrowthBook feature flags — STUB.
 * FROM CC: services/analytics/growthbook.js
 * QiLing has no GrowthBook backend; flags resolve to their defaults.
 */
export function getFeatureValue_CACHED_MAY_BE_STALE<T>(
  _flag: string,
  defaultValue: T,
): T {
  return defaultValue;
}
