/**
 * Color diff module detection — adapted from CC's components/StructuredDiff/colorDiff.ts
 *
 * Guards access to color-diff-napi (CC-only native module).
 * In QiLing: always returns null (module not available in OSS builds).
 * Set CLAUDE_CODE_SYNTAX_HIGHLIGHT=false to explicitly disable.
 */

import { isEnvDefinedFalsy } from '../../utils/envUtils.js'

export type ColorModuleUnavailableReason = 'env' | 'not_installed'

export function getColorModuleUnavailableReason(): ColorModuleUnavailableReason {
  if (isEnvDefinedFalsy(process.env.CLAUDE_CODE_SYNTAX_HIGHLIGHT)) return 'env'
  return 'not_installed' // color-diff-napi is CC-internal
}

export function expectColorDiff(): null { return null }
export function expectColorFile(): null { return null }
export function getSyntaxTheme(_themeName: string): null { return null }
