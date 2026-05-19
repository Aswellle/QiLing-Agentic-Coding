/**
 * Model allowlist — adapted from CC's utils/model/modelAllowlist.ts
 *
 * Checks if a model is permitted by the `availableModels` setting.
 * Supports family wildcards ("opus"), version prefixes ("opus-4-5"), and
 * exact model IDs. Family wildcards are narrowed by more specific entries.
 */

import { loadSettings } from '../../settings/loader.js'
import { isModelAlias, isModelFamilyAlias } from './aliases.js'

function modelBelongsToFamily(model: string, family: string): boolean {
  if (model.includes(family)) return true
  if (isModelAlias(model)) {
    return model.toLowerCase().includes(family)
  }
  return false
}

function prefixMatchesModel(modelName: string, prefix: string): boolean {
  if (!modelName.startsWith(prefix)) return false
  return modelName.length === prefix.length || modelName[prefix.length] === '-'
}

function modelMatchesVersionPrefix(model: string, entry: string): boolean {
  if (prefixMatchesModel(model, entry)) return true
  if (!entry.startsWith('claude-') && prefixMatchesModel(model, `claude-${entry}`)) return true
  return false
}

function familyHasSpecificEntries(family: string, allowlist: string[]): boolean {
  for (const entry of allowlist) {
    if (isModelFamilyAlias(entry)) continue
    const idx = entry.indexOf(family)
    if (idx === -1) continue
    const afterFamily = idx + family.length
    if (afterFamily === entry.length || entry[afterFamily] === '-') return true
  }
  return false
}

/**
 * Check if a model is allowed by the availableModels allowlist in settings.
 * Returns true if no restriction is configured.
 *
 * Matching tiers (most → least specific):
 * 1. Family aliases ("opus", "sonnet") — wildcard for the family, unless
 *    more specific entries exist (e.g., "opus-4-5" narrows "opus")
 * 2. Version prefixes ("opus-4-5", "claude-opus-4-5") — any build of that version
 * 3. Full model IDs — exact match
 */
export function isModelAllowed(model: string): boolean {
  let availableModels: string[] | undefined
  try {
    const settings = loadSettings(process.cwd()) as { availableModels?: string[] }
    availableModels = settings.availableModels
  } catch {
    return true
  }
  if (!availableModels) return true
  if (availableModels.length === 0) return false

  const normalizedModel = model.trim().toLowerCase()
  const normalizedAllowlist = availableModels.map(m => m.trim().toLowerCase())

  // Direct match
  if (normalizedAllowlist.includes(normalizedModel)) {
    if (!isModelFamilyAlias(normalizedModel) || !familyHasSpecificEntries(normalizedModel, normalizedAllowlist)) {
      return true
    }
  }

  // Family wildcard (non-narrowed)
  for (const entry of normalizedAllowlist) {
    if (isModelFamilyAlias(entry) &&
        !familyHasSpecificEntries(entry, normalizedAllowlist) &&
        modelBelongsToFamily(normalizedModel, entry)) {
      return true
    }
  }

  // Version-prefix matching
  for (const entry of normalizedAllowlist) {
    if (!isModelFamilyAlias(entry) && !isModelAlias(entry)) {
      if (modelMatchesVersionPrefix(normalizedModel, entry)) return true
    }
  }

  return false
}
