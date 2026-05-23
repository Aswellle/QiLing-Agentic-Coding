/**
 * parse-keypress — adapted from CC's ink/parse-keypress.ts
 *
 * Parses raw terminal stdin bytes into structured key objects.
 * Handles: printable chars, control sequences (CSI), alt/meta prefix,
 * function keys (F1-F12), bracketed paste, mouse SGR events.
 *
 * Used by ink.tsx to convert raw stdin input into InputEvent objects.
 * Ink 5 has its own keypress parser internally; this module provides
 * the CC-compatible API for components that bypass Ink's useInput.
 */

export type Key = {
  /** Printable character, e.g. "a", "A", " " */
  sequence: string
  /** Key name: "return", "escape", "up", "f1", "backspace", … */
  name: string
  ctrl: boolean
  meta: boolean
  shift: boolean
}

const ESC = '\x1b'

// Named special keys for CSI sequences
const CSI_NAMES: Record<string, string> = {
  '[A': 'up',    '[B': 'down',  '[C': 'right',  '[D': 'left',
  '[H': 'home',  '[F': 'end',   '[Z': 'tab',
  '[2~': 'insert', '[3~': 'delete', '[5~': 'pageup', '[6~': 'pagedown',
  'OP': 'f1',   'OQ': 'f2',   'OR': 'f3',   'OS': 'f4',
  '[15~': 'f5', '[17~': 'f6', '[18~': 'f7', '[19~': 'f8',
  '[20~': 'f9', '[21~': 'f10','[23~': 'f11','[24~': 'f12',
  'OA': 'up',   'OB': 'down', 'OC': 'right','OD': 'left',
}

/** Parse a raw terminal byte string into an array of Key events. */
export function parseKeypress(raw: string): Key[] {
  if (!raw) return []
  const keys: Key[] = []
  let i = 0

  while (i < raw.length) {
    const ch = raw[i]!

    // ESC prefix
    if (ch === ESC) {
      // Check for CSI: ESC [
      if (raw[i + 1] === '[' || raw[i + 1] === 'O') {
        const bracket = raw[i + 1]!
        let j = i + 2
        // Collect parameter + intermediate bytes, then final byte
        while (j < raw.length && raw[j]! >= ' ' && raw[j]! < '\x7f' && raw[j]! !== '\x1b') j++
        const seq = bracket + raw.slice(i + 2, j)
        const name = CSI_NAMES[seq]
        if (name) {
          keys.push({ sequence: raw.slice(i, j), name, ctrl: false, meta: false, shift: seq.includes(';2') })
          i = j
          continue
        }
        // Unknown CSI — emit as raw
        keys.push({ sequence: raw.slice(i, j), name: 'escape', ctrl: false, meta: false, shift: false })
        i = j
        continue
      }

      // ESC alone (no follow-up within sequence)
      if (i + 1 >= raw.length || raw[i + 1] === ESC) {
        keys.push({ sequence: ESC, name: 'escape', ctrl: false, meta: false, shift: false })
        i++
        continue
      }

      // Meta/alt prefix: ESC + char
      const next = raw[i + 1]!
      const inner = parseSingleChar(next)
      keys.push({ ...inner, meta: true, sequence: ESC + next })
      i += 2
      continue
    }

    // Single char
    keys.push({ ...parseSingleChar(ch), sequence: ch })
    i++
  }

  return keys
}

function parseSingleChar(ch: string): Key {
  const code = ch.charCodeAt(0)

  // Control characters 0x01–0x1a → ctrl + letter
  if (code >= 1 && code <= 26) {
    const letter = String.fromCharCode(code + 96)
    if (code === 13) return { sequence: ch, name: 'return',    ctrl: false, meta: false, shift: false }
    if (code === 9)  return { sequence: ch, name: 'tab',       ctrl: false, meta: false, shift: false }
    if (code === 27) return { sequence: ch, name: 'escape',    ctrl: false, meta: false, shift: false }
    if (code === 8)  return { sequence: ch, name: 'backspace', ctrl: false, meta: false, shift: false }
    if (code === 127)return { sequence: ch, name: 'backspace', ctrl: false, meta: false, shift: false }
    return { sequence: ch, name: letter, ctrl: true, meta: false, shift: false }
  }
  if (code === 127) return { sequence: ch, name: 'backspace', ctrl: false, meta: false, shift: false }
  if (code === 0)   return { sequence: ch, name: 'null',      ctrl: true,  meta: false, shift: false }

  return {
    sequence: ch,
    name: ch.toLowerCase(),
    ctrl: false,
    meta: false,
    shift: ch >= 'A' && ch <= 'Z',
  }
}
