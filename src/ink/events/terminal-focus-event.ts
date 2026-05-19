/**
 * Terminal focus event — adapted from CC's ink/events/terminal-focus-event.ts
 *
 * Fired when the terminal window gains or loses focus.
 * Uses DECSET 1004 focus reporting (CSI I = focus, CSI O = blur).
 */

import { Event } from './event.js'

export type TerminalFocusEventType = 'terminalfocus' | 'terminalblur'

export class TerminalFocusEvent extends Event {
  readonly type: TerminalFocusEventType

  constructor(type: TerminalFocusEventType) {
    super()
    this.type = type
  }
}
