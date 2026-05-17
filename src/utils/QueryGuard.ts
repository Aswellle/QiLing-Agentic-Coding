/**
 * QueryGuard — direct port of CC's utils/QueryGuard.ts
 *
 * Synchronous state machine for the query lifecycle.
 * Three states: idle → dispatching → running → idle
 * Prevents re-entry when a query is already in progress.
 */

import { createSignal } from './signal'

export class QueryGuard {
  private _status: 'idle' | 'dispatching' | 'running' = 'idle'
  private _generation = 0
  private _changed = createSignal()

  /** Reserve the guard. idle → dispatching. Returns false if not idle. */
  reserve(): boolean {
    if (this._status !== 'idle') return false
    this._status = 'dispatching'
    this._notify()
    return true
  }

  /** Cancel reservation. dispatching → idle. */
  cancelReservation(): void {
    if (this._status !== 'dispatching') return
    this._status = 'idle'
    this._notify()
  }

  /**
   * Start a query. Returns generation number, or null if already running.
   * Accepts transitions from idle (direct submit) and dispatching (queue path).
   */
  tryStart(): number | null {
    if (this._status === 'running') return null
    this._status = 'running'
    ++this._generation
    this._notify()
    return this._generation
  }

  /**
   * End a query. Returns true if this generation is still current.
   * Returns false if a newer query started (stale finally block).
   */
  end(generation: number): boolean {
    if (this._generation !== generation) return false
    if (this._status !== 'running') return false
    this._status = 'idle'
    this._notify()
    return true
  }

  /** Force-end regardless of generation. Increments generation to invalidate stale blocks. */
  forceEnd(): void {
    if (this._status === 'idle') return
    this._status = 'idle'
    ++this._generation
    this._notify()
  }

  get isActive(): boolean { return this._status !== 'idle' }
  get generation(): number { return this._generation }

  subscribe = this._changed.subscribe
  getSnapshot = (): boolean => this._status !== 'idle'

  private _notify(): void { this._changed.emit() }
}
