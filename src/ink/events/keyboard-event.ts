/**
 * Keyboard event — adapted from CC's ink/events/keyboard-event.ts
 *
 * Dispatched through the DOM tree via capture/bubble phases.
 * Follows browser KeyboardEvent semantics: `key` is the literal char for
 * printable keys and a multi-char name for special keys ('down', 'return', etc).
 */

import { TerminalEvent } from './terminal-event.js'

type ParsedKey = {
  sequence?: string
  name?: string
  ctrl: boolean
  shift: boolean
  meta: boolean
  option?: boolean
  super: boolean
  fn: boolean
}

export class KeyboardEvent extends TerminalEvent {
  readonly key: string
  readonly ctrl: boolean
  readonly shift: boolean
  readonly meta: boolean
  readonly superKey: boolean
  readonly fn: boolean

  constructor(parsedKey: ParsedKey) {
    super('keydown', { bubbles: true, cancelable: true })
    this.key = keyFromParsed(parsedKey)
    this.ctrl = parsedKey.ctrl
    this.shift = parsedKey.shift
    this.meta = parsedKey.meta || (parsedKey.option ?? false)
    this.superKey = parsedKey.super
    this.fn = parsedKey.fn
  }
}

function keyFromParsed(parsed: ParsedKey): string {
  const seq = parsed.sequence ?? ''
  const name = parsed.name ?? ''

  if (parsed.ctrl) return name

  if (seq.length === 1) {
    const code = seq.charCodeAt(0)
    if (code >= 0x20 && code !== 0x7f) return seq
  }

  return name || seq
}
