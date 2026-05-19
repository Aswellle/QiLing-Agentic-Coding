/**
 * Denial tracking — CC path compatibility re-export.
 * Implementation: permissions/denialTracking.ts
 */

export {
  type DenialTrackingState,
  DENIAL_LIMITS,
  createDenialTrackingState,
  recordDenial,
  recordSuccess,
  shouldFallbackToPrompting,
} from '../../permissions/denialTracking.js'
