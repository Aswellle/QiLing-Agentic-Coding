/**
 * loadUserBindings — adapted from CC's keybindings/loadUserBindings.ts
 *
 * Async loader for user keybinding overrides. Reads
 * ~/.qiling/keybindings.json, validates against the schema, merges
 * with DEFAULT_BINDINGS, and returns the combined KeybindingBlock[].
 *
 * QiLing: thin async wrapper around the synchronous loader.ts.
 * Separated so the KeybindingProviderSetup can await it without
 * blocking the synchronous settings load at startup.
 */

import { readFile, access } from 'fs/promises'
import { constants } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import type { KeybindingBlock, UserKeybindingsFile } from './types.js'
import { DEFAULT_BINDINGS } from './defaultBindings.js'

export const USER_KEYBINDINGS_PATH = join(homedir(), '.qiling', 'keybindings.json')

/**
 * Load and merge keybindings asynchronously.
 * Returns DEFAULT_BINDINGS if the user file does not exist or is malformed.
 */
export async function loadUserBindings(): Promise<{
  blocks: KeybindingBlock[]
  customLoaded: boolean
  error?: string
}> {
  try {
    await access(USER_KEYBINDINGS_PATH, constants.R_OK)
  } catch {
    return { blocks: DEFAULT_BINDINGS, customLoaded: false }
  }

  let raw: string
  try {
    raw = await readFile(USER_KEYBINDINGS_PATH, 'utf8')
  } catch (err) {
    return {
      blocks: DEFAULT_BINDINGS,
      customLoaded: false,
      error: `Failed to read ${USER_KEYBINDINGS_PATH}: ${String(err)}`,
    }
  }

  let parsed: UserKeybindingsFile
  try {
    parsed = JSON.parse(raw) as UserKeybindingsFile
  } catch {
    return {
      blocks: DEFAULT_BINDINGS,
      customLoaded: false,
      error: `Invalid JSON in ${USER_KEYBINDINGS_PATH}`,
    }
  }

  const userBlocks = parsed.bindings ?? []
  // Merge: user blocks override defaults for matching context + action
  const merged = mergeBindings(DEFAULT_BINDINGS, userBlocks)
  return { blocks: merged, customLoaded: true }
}

function mergeBindings(
  defaults: KeybindingBlock[],
  overrides: KeybindingBlock[],
): KeybindingBlock[] {
  const result = defaults.map(block => ({ ...block, bindings: { ...block.bindings } }))
  for (const override of overrides) {
    let found = result.find(b => b.context === override.context)
    if (!found) {
      found = { context: override.context, bindings: {} }
      result.push(found)
    }
    Object.assign(found.bindings, override.bindings)
  }
  return result
}
