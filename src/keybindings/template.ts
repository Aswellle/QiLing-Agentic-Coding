/**
 * Keybindings template generator — adapted from CC's keybindings/template.ts
 *
 * Generates a well-documented ~/.qiling/keybindings.json template
 * containing all default bindings with reserved shortcuts filtered out.
 */

import { DEFAULT_BINDINGS } from './defaultBindings.js'
import { NON_REBINDABLE, normalizeKeyForComparison } from './reservedShortcuts.js'
import type { KeybindingBlock } from './types.js'

function filterReservedShortcuts(blocks: KeybindingBlock[]): KeybindingBlock[] {
  const reservedKeys = new Set(NON_REBINDABLE.map(r => normalizeKeyForComparison(r.key)))
  return blocks
    .map(block => {
      const filteredBindings: Record<string, string | null> = {}
      for (const [key, action] of Object.entries(block.bindings)) {
        if (!reservedKeys.has(normalizeKeyForComparison(key))) {
          filteredBindings[key] = action
        }
      }
      return { context: block.context, bindings: filteredBindings }
    })
    .filter(block => Object.keys(block.bindings).length > 0)
}

export function generateKeybindingsTemplate(): string {
  const bindings = filterReservedShortcuts(DEFAULT_BINDINGS)
  const config = {
    $schema: 'https://qiling.ai/keybindings.schema.json',
    bindings,
  }
  return JSON.stringify(config, null, 2) + '\n'
}
