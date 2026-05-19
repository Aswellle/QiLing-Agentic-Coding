/**
 * Terminal event base class — adapted from CC's ink/events/terminal-event.ts
 *
 * DOM-style event propagation for terminal events (keyboard, click, focus).
 * Mirrors browser's Event API: target, currentTarget, eventPhase, stopPropagation, preventDefault.
 */

import { Event } from './event.js'

type EventPhase = 'none' | 'capturing' | 'at_target' | 'bubbling'
type TerminalEventInit = { bubbles?: boolean; cancelable?: boolean }

export type EventTarget = {
  parentNode: EventTarget | undefined
  _eventHandlers?: Record<string, unknown>
}

export class TerminalEvent extends Event {
  readonly type: string
  readonly timeStamp: number
  readonly bubbles: boolean
  readonly cancelable: boolean

  private _target: EventTarget | null = null
  private _currentTarget: EventTarget | null = null
  private _eventPhase: EventPhase = 'none'
  private _propagationStopped = false
  private _defaultPrevented = false

  constructor(type: string, init?: TerminalEventInit) {
    super()
    this.type = type
    this.timeStamp = performance.now()
    this.bubbles = init?.bubbles ?? true
    this.cancelable = init?.cancelable ?? true
  }

  get target(): EventTarget | null { return this._target }
  get currentTarget(): EventTarget | null { return this._currentTarget }
  get eventPhase(): EventPhase { return this._eventPhase }
  get defaultPrevented(): boolean { return this._defaultPrevented }

  stopPropagation(): void { this._propagationStopped = true }

  override stopImmediatePropagation(): void {
    super.stopImmediatePropagation()
    this._propagationStopped = true
  }

  preventDefault(): void {
    if (this.cancelable) this._defaultPrevented = true
  }

  /** @internal */ _setTarget(target: EventTarget): void { this._target = target }
  /** @internal */ _setCurrentTarget(t: EventTarget | null): void { this._currentTarget = t }
  /** @internal */ _setEventPhase(phase: EventPhase): void { this._eventPhase = phase }
  /** @internal */ _isPropagationStopped(): boolean { return this._propagationStopped }
  /** @internal */ _isImmediatePropagationStopped(): boolean { return this.didStopImmediatePropagation() }
  /** Hook for subclasses to do per-node setup before each handler fires. */
  _prepareForTarget(_target: EventTarget): void {}
}
