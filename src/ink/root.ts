/**
 * Ink root — adapted from CC's ink/root.ts
 *
 * The root Ink instance wrapper that manages:
 *   - React root + reconciler attachment
 *   - Stdin/stdout lifecycle (raw mode, signal handlers)
 *   - Resize (SIGWINCH) handling
 *   - Clean exit (restore terminal state)
 *
 * QiLing stub: Ink 5's `render()` handles all of this internally.
 * This module re-exports the public surface so CC-compat importers
 * type-check. In B-T4-14 (ink.tsx) we will intercept the Ink instance
 * to attach custom patches (search highlight, selection, custom renderer).
 *
 * Phase B-T4-14: wire RootInstance to InkInstance from ink.tsx.
 */

import type { Instance } from 'ink'

export type ExitListener = (error?: Error) => void

/**
 * RootInstance — the handle returned when you mount an Ink tree.
 * Mirrors the Ink `Instance` type with additional QiLing hooks.
 */
export type RootInstance = Instance & {
  /** Register a callback to run when the Ink app exits. */
  onExit(listener: ExitListener): void
  /** Remove an exit listener. */
  offExit(listener: ExitListener): void
}

/** Options forwarded to Ink's render() + our custom pipeline. */
export type RootOptions = {
  stdout?: NodeJS.WriteStream
  stdin?: NodeJS.ReadStream
  stderr?: NodeJS.WriteStream
  /** Disable raw mode (useful for tests) */
  patchConsole?: boolean
  exitOnCtrlC?: boolean
  /** Use alternate screen buffer */
  alternateScreen?: boolean
  /** Enable mouse tracking */
  mouseTracking?: boolean
}

/**
 * Wrap an Ink Instance to add onExit / offExit listeners.
 * QiLing stub: delegates everything to the ink Instance.
 */
export function wrapInstance(instance: Instance): RootInstance {
  const listeners = new Set<ExitListener>()

  instance.waitUntilExit().then(() => {
    for (const cb of listeners) cb()
  }).catch((err: unknown) => {
    for (const cb of listeners) cb(err instanceof Error ? err : new Error(String(err)))
  })

  return {
    ...instance,
    onExit(listener: ExitListener) { listeners.add(listener) },
    offExit(listener: ExitListener) { listeners.delete(listener) },
  }
}

/**
 * Dimensions of the active root (updated on SIGWINCH).
 * Falls back to process.stdout dimensions.
 */
export function getRootDimensions(): { rows: number; columns: number } {
  return {
    rows: process.stdout.rows ?? 24,
    columns: process.stdout.columns ?? 80,
  }
}
