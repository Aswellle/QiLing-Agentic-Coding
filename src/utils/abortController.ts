/**
 * AbortController utilities — ported from CC's utils/abortController.ts (verbatim)
 *
 * Key functions:
 * - createAbortController(): AbortController with proper max listener limits
 * - createChildAbortController(): memory-safe child that aborts when parent aborts
 */

import { setMaxListeners } from 'events'

const DEFAULT_MAX_LISTENERS = 50

export function createAbortController(maxListeners = DEFAULT_MAX_LISTENERS): AbortController {
  const controller = new AbortController()
  setMaxListeners(maxListeners, controller.signal)
  return controller
}

function propagateAbort(this: WeakRef<AbortController>, weakChild: WeakRef<AbortController>): void {
  const parent = this.deref()
  weakChild.deref()?.abort(parent?.signal.reason)
}

function removeAbortHandler(this: WeakRef<AbortController>, weakHandler: WeakRef<(...args: unknown[]) => void>): void {
  const parent = this.deref()
  const handler = weakHandler.deref()
  if (parent && handler) parent.signal.removeEventListener('abort', handler)
}

/**
 * Creates a child AbortController that aborts when its parent aborts.
 * Memory-safe: parent holds only a WeakRef to the child — abandoned children can be GC'd.
 */
export function createChildAbortController(parent: AbortController, maxListeners?: number): AbortController {
  const child = createAbortController(maxListeners)
  if (parent.signal.aborted) { child.abort(parent.signal.reason); return child }

  const weakChild = new WeakRef(child)
  const weakParent = new WeakRef(parent)
  const handler = propagateAbort.bind(weakParent, weakChild)
  parent.signal.addEventListener('abort', handler, { once: true })
  child.signal.addEventListener('abort', removeAbortHandler.bind(weakParent, new WeakRef(handler)), { once: true })
  return child
}
