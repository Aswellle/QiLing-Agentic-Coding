/**
 * Renderer — adapted from CC's ink/renderer.ts
 *
 * Coordinates the full rendering pipeline:
 *   yoga layout → render-to-screen → diff (optimizer) → patch stdout
 *
 * QiLing stub: the heavy internal stages (screen buffer, diff, optimizer)
 * depend on ink/screen.ts and ink/render-to-screen.ts (B-T4-13) which are
 * not yet ported. This module provides the public API + type signatures so
 * dependent modules type-check. Ink 5's internal renderer handles actual
 * output; this layer will intercept for custom patches in B-T4-13.
 *
 * Phase B-T4-13: wire renderCycle() to real screen + diff pipeline.
 */

import type { Frame } from './frame.js'

export type RendererOptions = {
  stdout: NodeJS.WriteStream
  /** Terminal dimensions */
  rows: number
  columns: number
  /** Suppress all output (test mode) */
  silent?: boolean
  /** Emit timing / perf events */
  debug?: boolean
}

export type RenderStats = {
  durationMs: number
  patchCount: number
  flickerCount: number
}

export type RendererEventMap = {
  frame: (frame: Frame, stats: RenderStats) => void
  resize: (rows: number, columns: number) => void
  exit: (error?: Error) => void
}

/**
 * Renderer instance — created once per Ink session.
 * QiLing stub: delegates all output to Ink 5's built-in renderer.
 */
export type Renderer = {
  /** Trigger a synchronous render cycle. */
  render(): void
  /** Flush any buffered output and release terminal resources. */
  destroy(error?: Error): void
  /** Update terminal dimensions after a SIGWINCH. */
  resize(rows: number, columns: number): void
  /** Register an event listener. */
  on<K extends keyof RendererEventMap>(event: K, listener: RendererEventMap[K]): void
  /** Remove an event listener. */
  off<K extends keyof RendererEventMap>(event: K, listener: RendererEventMap[K]): void
  /** Get the last rendered frame (null before first render). */
  getLastFrame(): Frame | null
  /** Current terminal dimensions. */
  readonly rows: number
  readonly columns: number
}

class RendererImpl implements Renderer {
  private _rows: number
  private _columns: number
  private _lastFrame: Frame | null = null
  private _listeners = new Map<string, Set<(...args: unknown[]) => void>>()

  constructor(opts: RendererOptions) {
    this._rows = opts.rows
    this._columns = opts.columns
  }

  get rows(): number { return this._rows }
  get columns(): number { return this._columns }

  render(): void {
    // QiLing stub: Ink 5 handles output internally via its own renderer.
    // In B-T4-13 this will run: yoga layout → renderToScreen → optimizer.diff → patch stdout
  }

  destroy(_error?: Error): void {
    this._emit('exit', _error)
  }

  resize(rows: number, columns: number): void {
    this._rows = rows
    this._columns = columns
    this._emit('resize', rows, columns)
  }

  on<K extends keyof RendererEventMap>(event: K, listener: RendererEventMap[K]): void {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set())
    this._listeners.get(event)!.add(listener as (...args: unknown[]) => void)
  }

  off<K extends keyof RendererEventMap>(event: K, listener: RendererEventMap[K]): void {
    this._listeners.get(event)?.delete(listener as (...args: unknown[]) => void)
  }

  getLastFrame(): Frame | null { return this._lastFrame }

  private _emit(event: string, ...args: unknown[]): void {
    for (const listener of this._listeners.get(event) ?? []) {
      listener(...args)
    }
  }
}

export function createRenderer(opts: RendererOptions): Renderer {
  return new RendererImpl(opts)
}
