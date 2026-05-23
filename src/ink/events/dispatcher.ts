/**
 * Event dispatcher — adapted from CC's ink/events/dispatcher.ts
 *
 * Routes keyboard / mouse / focus InputEvents from the stdin parser
 * through the active focus tree and hit-test for mouse events.
 * Fires the appropriate React synthetic event handlers.
 *
 * QiLing adaptation:
 * - Thin wrapper; heavy routing delegated to Ink 5's built-in input system
 * - Mouse routing calls ink/hit-test.ts for click/hover dispatch
 * - Keyboard routing fires through Ink's useInput subscribers
 */

import type { InputEvent } from './input-event.js'
import { dispatchClick, dispatchHover } from '../hit-test.js'

export type DOMElement = {
  nodeName: string
  childNodes: DOMElement[]
  parentNode: DOMElement | undefined
  attributes: Record<string, unknown>
  _eventHandlers?: Record<string, unknown>
  focusManager?: { handleClickFocus: (node: DOMElement) => void }
}

export type DispatcherOptions = {
  root: DOMElement
  /** If provided, keyboard events are sent through this subscriber list */
  onKeypress?: (event: InputEvent) => void
}

type HoveredSet = Set<DOMElement>

export class EventDispatcher {
  private _root: DOMElement
  private _hovered: HoveredSet = new Set()
  private _onKeypress: ((event: InputEvent) => void) | undefined

  constructor(opts: DispatcherOptions) {
    this._root = opts.root
    this._onKeypress = opts.onKeypress
  }

  /** Update the root DOM node (called after each render). */
  setRoot(root: DOMElement): void {
    this._root = root
  }

  /** Dispatch a parsed InputEvent to the appropriate handlers. */
  dispatch(event: InputEvent): void {
    switch (event.type) {
      case 'keypress':
        this._dispatchKeypress(event)
        break
      case 'mouse':
        this._dispatchMouse(event)
        break
      case 'paste':
        this._dispatchKeypress(event) // treat paste as keypress sequence
        break
      case 'focus':
      case 'resize':
        // handled upstream by Ink / REPL
        break
    }
  }

  private _dispatchKeypress(event: InputEvent): void {
    this._onKeypress?.(event)
  }

  private _dispatchMouse(event: InputEvent): void {
    const m = event.mouse
    if (!m) return
    if (m.action === 'press' && m.button === 'left') {
      dispatchClick(this._root as Parameters<typeof dispatchClick>[0], m.x, m.y)
    } else if (m.action === 'move') {
      dispatchHover(this._root as Parameters<typeof dispatchHover>[0], m.x, m.y, this._hovered as Parameters<typeof dispatchHover>[3])
    }
  }
}

/** Factory — creates a dispatcher bound to the given root. */
export function createDispatcher(opts: DispatcherOptions): EventDispatcher {
  return new EventDispatcher(opts)
}
