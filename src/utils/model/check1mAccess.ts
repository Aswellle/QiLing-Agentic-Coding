/**
 * 1M context access checks — adapted from CC's utils/model/check1mAccess.ts
 *
 * Determines whether the user has access to 1M context window models.
 * In QiLing: all API users have access unless explicitly disabled.
 */

function isContextDisabled(): boolean {
  return (
    process.env.QILING_DISABLE_1M_CONTEXT === '1' ||
    process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT === '1'
  )
}

/**
 * Check if the user has access to Opus 1M context.
 * Returns false if QILING_DISABLE_1M_CONTEXT=1 (or CLAUDE_CODE_DISABLE_1M_CONTEXT=1).
 *
 * @[MODEL LAUNCH]: Update if new models have different access requirements.
 */
export function checkOpus1mAccess(): boolean {
  if (isContextDisabled()) return false
  return true  // API/PAYG users always have access
}

/**
 * Check if the user has access to Sonnet 1M context.
 */
export function checkSonnet1mAccess(): boolean {
  if (isContextDisabled()) return false
  return true
}
