import { readFileSync, existsSync, watch } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { parseChord } from './parser'
import type { KeybindingBlock, ParsedBinding, UserKeybindingsFile } from './types'
import { DEFAULT_BINDINGS } from './defaultBindings'

export const USER_KEYBINDINGS_PATH = join(homedir(), '.qiling', 'keybindings.json')

/**
 * Parse a list of KeybindingBlock entries into flat ParsedBinding list.
 * Invalid key strings are silently skipped.
 */
export function parseBindings(blocks: KeybindingBlock[]): ParsedBinding[] {
  const result: ParsedBinding[] = []
  for (const block of blocks) {
    for (const [keyStr, action] of Object.entries(block.bindings)) {
      try {
        const chord = parseChord(keyStr)
        result.push({ context: block.context, chord, action })
      } catch {
        // Skip invalid key strings silently
      }
    }
  }
  return result
}

/**
 * Load keybindings synchronously.
 *
 * Returns defaults merged with user overrides from ~/.qiling/keybindings.json.
 * User bindings are appended after defaults — last-wins semantics in the resolver
 * means user bindings override defaults for the same key+context.
 */
export function loadKeybindingsSync(): ParsedBinding[] {
  const defaults = parseBindings(DEFAULT_BINDINGS)

  try {
    if (existsSync(USER_KEYBINDINGS_PATH)) {
      const raw = readFileSync(USER_KEYBINDINGS_PATH, 'utf-8')
      const userFile = JSON.parse(raw) as UserKeybindingsFile
      if (Array.isArray(userFile.bindings)) {
        const userBindings = parseBindings(userFile.bindings)
        // Append user bindings after defaults — resolver uses last-wins
        return [...defaults, ...userBindings]
      }
    }
  } catch {
    // Ignore missing file, JSON parse errors, or I/O errors
  }

  return defaults
}

/**
 * Watch ~/.qiling/keybindings.json for changes and call onChange with
 * reloaded bindings. Returns a cleanup function that stops watching.
 *
 * Falls back to a no-op if the file doesn't exist or watching fails.
 */
export function watchKeybindings(onChange: (bindings: ParsedBinding[]) => void): () => void {
  // Only set up watch if the file exists
  if (!existsSync(USER_KEYBINDINGS_PATH)) {
    return () => {}
  }

  try {
    const watcher = watch(USER_KEYBINDINGS_PATH, { persistent: false }, (_eventType) => {
      // Reload on any change
      const bindings = loadKeybindingsSync()
      onChange(bindings)
    })

    return () => {
      try {
        watcher.close()
      } catch {
        // Ignore close errors
      }
    }
  } catch {
    // watch() can throw on some platforms/configurations
    return () => {}
  }
}
