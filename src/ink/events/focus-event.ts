/**
 * Focus event — adapted from CC's ink/events/focus-event.ts
 *
 * Dispatched when focus moves between components.
 * 'focus' fires on the newly focused element; 'blur' on the previously focused.
 * Both bubble (like react-dom's focusin/focusout) so parents can observe.
 */

import { type EventTarget, TerminalEvent } from './terminal-event.js'

export class FocusEvent extends TerminalEvent {
  readonly relatedTarget: EventTarget | null

  constructor(type: 'focus' | 'blur', relatedTarget: EventTarget | null = null) {
    super(type, { bubbles: true, cancelable: false })
    this.relatedTarget = relatedTarget
  }
}
