/**
 * log-update — adapted from CC's ink/log-update.ts
 *
 * Provides a log-update style output helper: writes text to stdout
 * and on subsequent calls erases and rewrites the previous output
 * in-place. Used for progress spinners and status lines outside of
 * Ink's managed render loop (e.g., during startup / teardown).
 *
 * QiLing: minimal implementation using ANSI erase sequences.
 * Does not depend on screen.ts or the Ink renderer.
 */

import { ESC } from './termio/csi.js'

type LogUpdateInstance = {
  /** Write text, erasing the previous output first. */
  (text: string): void
  /** Erase the last output and stop updating. */
  clear: () => void
  /** Persist the current output (stop erasing on next update). */
  done: () => void
}

/**
 * Create a log-update instance bound to a specific output stream.
 */
export function createLogUpdate(out: NodeJS.WriteStream = process.stdout): LogUpdateInstance {
  let previousLineCount = 0

  function erase(): void {
    if (previousLineCount === 0) return
    // Move cursor up and erase each line
    for (let i = 0; i < previousLineCount; i++) {
      out.write(`${ESC}[2K`) // erase line
      if (i < previousLineCount - 1) out.write(`${ESC}[1A`) // move up
    }
    out.write(`\r`) // return to start of line
    previousLineCount = 0
  }

  const update = (text: string): void => {
    erase()
    out.write(text)
    // Count lines written (trailing newline does not count as a line)
    previousLineCount = (text.match(/\n/g) ?? []).length
    if (!text.endsWith('\n')) previousLineCount++
  }

  update.clear = (): void => {
    erase()
  }

  update.done = (): void => {
    previousLineCount = 0
  }

  return update
}

/** Default log-update instance bound to process.stdout. */
export const logUpdate = createLogUpdate(process.stdout)
