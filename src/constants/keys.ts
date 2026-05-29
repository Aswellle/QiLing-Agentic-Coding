// FROM CC: constants/keys.ts (adapt-new)
// Stripped: ANT/GrowthBook SDK keys — QiLing uses public (non-ANT) key only
import { isEnvTruthy } from '../utils/envUtils.js'

export function getGrowthBookClientKey(): string {
  // QiLing: GrowthBook not used internally; non-ANT public key returned as stub
  // Original ANT logic: USER_TYPE=ant → staging key; otherwise public key
  void isEnvTruthy // suppress unused import warning
  return 'sdk-zAZezfDKGoZuXXKe'
}
