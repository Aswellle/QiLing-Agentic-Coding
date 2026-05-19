/**
 * Base event class — adapted from CC's ink/events/event.ts
 *
 * Provides stopImmediatePropagation() for event dispatch chains.
 */

export class Event {
  private _didStopImmediatePropagation = false

  didStopImmediatePropagation(): boolean {
    return this._didStopImmediatePropagation
  }

  stopImmediatePropagation(): void {
    this._didStopImmediatePropagation = true
  }
}
