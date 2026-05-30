// FROM CC: utils/settings/mdm/settings.ts (adapt-new stub)
// MDM (Mobile Device Management) settings — platform-specific enterprise features
// Full port deferred; QiLing uses managed-settings.json path instead
import type { SettingsJson } from '../types.js'
import type { ValidationError } from '../validation.js'

export type MdmResult = { settings: SettingsJson; errors: ValidationError[] }

export function getHkcuSettings(): MdmResult {
  return { settings: {}, errors: [] }
}

export function getMdmSettings(): MdmResult {
  return { settings: {}, errors: [] }
}
