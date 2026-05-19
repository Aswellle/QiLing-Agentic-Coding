/**
 * EventEmitter aware of stopImmediatePropagation() — adapted from CC's ink/events/emitter.ts
 *
 * Like Node's EventEmitter but respects Event.stopImmediatePropagation().
 * Useful for Ink's event dispatch where a component can stop an event from
 * reaching ancestor handlers.
 */

import { EventEmitter as NodeEventEmitter } from 'node:events'
import { Event } from './event.js'

export class EventEmitter extends NodeEventEmitter {
  constructor() {
    super()
    // Disable maxListeners warning — many React components can legitimately
    // subscribe (e.g., multiple useInput hooks in different components)
    this.setMaxListeners(0)
  }

  override emit(type: string | symbol, ...args: unknown[]): boolean {
    // Delegate to Node for 'error' — not a normal bubbling event
    if (type === 'error') {
      return super.emit(type, ...args)
    }

    const listeners = this.rawListeners(type)
    if (listeners.length === 0) return false

    const event = args[0] instanceof Event ? args[0] : null

    for (const listener of listeners) {
      listener.apply(this, args)
      if (event?.didStopImmediatePropagation()) break
    }

    return true
  }
}
