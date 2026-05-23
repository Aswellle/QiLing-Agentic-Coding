/**
 * terminal — adapted from CC's ink/terminal.ts
 *
 * Manages terminal I/O lifecycle:
 *   - raw mode on/off
 *   - stdout/stderr output buffering
 *   - SIGWINCH resize events
 *   - cursor visibility
 *   - alternate screen setup/teardown
 *
 * QiLing: thin wrapper over Node.js process streams.
 * Heavy write buffering and alternate-screen logic from CC is delegated
 * to Ink 5's internal output handling; this module exposes the subset
 * used by coordinator mode, hooks, and AlternateScreen.tsx.
 */

import { ESC } from './termio/csi.js'

// ─── Raw mode ─────────────────────────────────────────────────────────────────

export function setRawMode(enabled: boolean): void {
  const stdin = process.stdin as NodeJS.ReadStream
  if (typeof stdin.setRawMode === 'function') {
    stdin.setRawMode(enabled)
  }
}

export function isRawModeSupported(): boolean {
  return typeof (process.stdin as NodeJS.ReadStream).setRawMode === 'function'
}

// ─── Cursor ───────────────────────────────────────────────────────────────────

export function hideCursor(out: NodeJS.WriteStream = process.stdout): void {
  out.write(`${ESC}[?25l`)
}

export function showCursor(out: NodeJS.WriteStream = process.stdout): void {
  out.write(`${ESC}[?25h`)
}

export function moveCursor(out: NodeJS.WriteStream, col: number, row: number): void {
  out.write(`${ESC}[${row + 1};${col + 1}H`)
}

// ─── Alternate screen ─────────────────────────────────────────────────────────

export function enterAlternateScreen(out: NodeJS.WriteStream = process.stdout): void {
  out.write(`${ESC}[?1049h`)
}

export function exitAlternateScreen(out: NodeJS.WriteStream = process.stdout): void {
  out.write(`${ESC}[?1049l`)
}

// ─── Mouse tracking ───────────────────────────────────────────────────────────

export function enableMouseTracking(out: NodeJS.WriteStream = process.stdout): void {
  // SGR extended mouse: button+motion+drag
  out.write(`${ESC}[?1003h${ESC}[?1006h`)
}

export function disableMouseTracking(out: NodeJS.WriteStream = process.stdout): void {
  out.write(`${ESC}[?1003l${ESC}[?1006l`)
}

// ─── Resize events ────────────────────────────────────────────────────────────

export type ResizeListener = (rows: number, columns: number) => void
const _resizeListeners = new Set<ResizeListener>()
let _resizeHandler: (() => void) | null = null

export function onResize(listener: ResizeListener): () => void {
  _resizeListeners.add(listener)
  if (!_resizeHandler) {
    _resizeHandler = () => {
      const rows = process.stdout.rows ?? 24
      const cols = process.stdout.columns ?? 80
      for (const cb of _resizeListeners) cb(rows, cols)
    }
    process.stdout.on('resize', _resizeHandler)
  }
  return () => { _resizeListeners.delete(listener) }
}

// ─── Output helpers ───────────────────────────────────────────────────────────

/** Write to stdout; no-op in test environments (TTY not available). */
export function writeOutput(text: string, out: NodeJS.WriteStream = process.stdout): void {
  if (out.writable) out.write(text)
}

/** Erase from cursor to end of screen. */
export function clearBelow(out: NodeJS.WriteStream = process.stdout): void {
  out.write(`${ESC}[0J`)
}

/** Erase the entire visible screen without scrollback. */
export function clearScreen(out: NodeJS.WriteStream = process.stdout): void {
  out.write(`${ESC}[2J`)
}

/** Get current terminal dimensions, with sane fallbacks. */
export function getTerminalSize(): { rows: number; columns: number } {
  return {
    rows: process.stdout.rows ?? 24,
    columns: process.stdout.columns ?? 80,
  }
}
