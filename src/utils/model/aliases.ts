/**
 * Model alias types — re-export from utils/modelAliases.ts for CC path compatibility.
 *
 * CC path: utils/model/aliases.ts
 * QiLing path: utils/modelAliases.ts (full implementation)
 *
 * This file provides CC-compatible import path so CC-sourced code can
 * `import from '../../utils/model/aliases.js'` without modification.
 */

export {
  MODEL_ALIASES,
  type ModelAlias,
  isModelAlias,
  MODEL_FAMILY_ALIASES,
  isModelFamilyAlias,
} from '../modelAliases.js'
