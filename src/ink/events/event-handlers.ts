/**
 * Event handler prop types — adapted from CC's ink/events/event-handlers.ts
 *
 * Defines the event handler props for Box and other host components,
 * plus a reverse lookup table for O(1) dispatch and a props set for
 * the reconciler.
 */

import type { ClickEvent } from './click-event.js'
import type { FocusEvent } from './focus-event.js'
import type { KeyboardEvent } from './keyboard-event.js'

type KeyboardEventHandler = (event: KeyboardEvent) => void
type FocusEventHandler = (event: FocusEvent) => void
type ClickEventHandler = (event: ClickEvent) => void
type HoverEventHandler = () => void

export type EventHandlerProps = {
  onKeyDown?: KeyboardEventHandler
  onKeyDownCapture?: KeyboardEventHandler

  onFocus?: FocusEventHandler
  onFocusCapture?: FocusEventHandler
  onBlur?: FocusEventHandler
  onBlurCapture?: FocusEventHandler

  onClick?: ClickEventHandler
  onMouseEnter?: HoverEventHandler
  onMouseLeave?: HoverEventHandler
}

export const HANDLER_FOR_EVENT: Record<
  string,
  { bubble?: keyof EventHandlerProps; capture?: keyof EventHandlerProps }
> = {
  keydown: { bubble: 'onKeyDown', capture: 'onKeyDownCapture' },
  focus: { bubble: 'onFocus', capture: 'onFocusCapture' },
  blur: { bubble: 'onBlur', capture: 'onBlurCapture' },
  click: { bubble: 'onClick' },
}

export const EVENT_HANDLER_PROPS = new Set<string>([
  'onKeyDown', 'onKeyDownCapture',
  'onFocus', 'onFocusCapture',
  'onBlur', 'onBlurCapture',
  'onClick', 'onMouseEnter', 'onMouseLeave',
])
