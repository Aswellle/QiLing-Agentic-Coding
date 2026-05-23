/**
 * InputEvent — adapted from CC's ink/events/input-event.ts
 *
 * Custom input event fired by the terminal stdin parser.
 * Carries both the raw key string and structured modifier flags.
 * Used by useInput, keybinding system, and vim mode.
 */

export type InputEventType = 'keypress' | 'paste' | 'mouse' | 'focus' | 'resize'

export type KeyModifiers = {
  readonly ctrl: boolean
  readonly meta: boolean
  readonly shift: boolean
}

export type MouseButton = 'left' | 'middle' | 'right' | 'none'

export type InputKey = {
  /** Raw character(s) received from stdin */
  readonly sequence: string
  /** Human-readable key name, e.g. "return", "escape", "up", "a" */
  readonly name: string
  readonly ctrl: boolean
  readonly meta: boolean
  readonly shift: boolean
  /** True for special keys (arrows, F-keys, etc.) */
  readonly special: boolean
}

export type MouseData = {
  readonly x: number
  readonly y: number
  readonly button: MouseButton
  readonly action: 'press' | 'release' | 'move'
  readonly modifiers: KeyModifiers
}

export type ResizeData = {
  readonly rows: number
  readonly columns: number
}

export class InputEvent {
  readonly type: InputEventType
  readonly key: InputKey | null
  readonly mouse: MouseData | null
  readonly resize: ResizeData | null
  readonly pasteText: string | null
  private _defaultPrevented = false
  private _propagationStopped = false

  constructor(
    type: InputEventType,
    data: {
      key?: InputKey
      mouse?: MouseData
      resize?: ResizeData
      pasteText?: string
    } = {},
  ) {
    this.type = type
    this.key = data.key ?? null
    this.mouse = data.mouse ?? null
    this.resize = data.resize ?? null
    this.pasteText = data.pasteText ?? null
  }

  preventDefault(): void { this._defaultPrevented = true }
  stopPropagation(): void { this._propagationStopped = true }
  isDefaultPrevented(): boolean { return this._defaultPrevented }
  isPropagationStopped(): boolean { return this._propagationStopped }
}

/** Convenience constructor for keypress events */
export function makeKeypressEvent(key: InputKey): InputEvent {
  return new InputEvent('keypress', { key })
}

/** Convenience constructor for paste events */
export function makePasteEvent(text: string): InputEvent {
  return new InputEvent('paste', { pasteText: text })
}

/** Convenience constructor for mouse events */
export function makeMouseEvent(mouse: MouseData): InputEvent {
  return new InputEvent('mouse', { mouse })
}

/** Convenience constructor for resize events */
export function makeResizeEvent(rows: number, columns: number): InputEvent {
  return new InputEvent('resize', { resize: { rows, columns } })
}
