/**
 * Ink render options helpers — adapted from CC's utils/renderOptions.ts
 *
 * Provides stdin override for interactive Ink rendering when stdin is piped
 * (e.g., when piping to Claude via `echo "prompt" | qiling`).
 *
 * Without this, Ink cannot read keyboard input when stdin is a pipe because
 * piped stdin is not a TTY. The workaround opens /dev/tty as an alternative
 * input source on Unix/macOS.
 */

import { openSync } from 'node:fs'
import { ReadStream } from 'node:tty'
import { logError } from './log.js'

// Cached stdin override — computed once per process
let cachedStdinOverride: ReadStream | undefined | null = null

function getStdinOverride(): ReadStream | undefined {
  if (cachedStdinOverride !== null) return cachedStdinOverride

  // No override needed if stdin is already a TTY
  if (process.stdin.isTTY) {
    cachedStdinOverride = undefined
    return undefined
  }

  // Skip in CI (no interactive TTY available)
  if (process.env.CI) {
    cachedStdinOverride = undefined
    return undefined
  }

  // Skip if running as MCP server (stdin hijacking breaks MCP)
  if (process.argv.includes('mcp')) {
    cachedStdinOverride = undefined
    return undefined
  }

  // /dev/tty not available on Windows
  if (process.platform === 'win32') {
    cachedStdinOverride = undefined
    return undefined
  }

  try {
    const ttyFd = openSync('/dev/tty', 'r')
    const ttyStream = new ReadStream(ttyFd)
    // Explicitly mark as TTY — Bun compiled binaries may not detect this automatically
    ttyStream.isTTY = true
    cachedStdinOverride = ttyStream
    return cachedStdinOverride
  } catch (err) {
    logError(err as Error)
    cachedStdinOverride = undefined
    return undefined
  }
}

export type RenderOptions = {
  exitOnCtrlC?: boolean
  stdin?: ReadStream
  [key: string]: unknown
}

/**
 * Get base render options for Ink, including stdin override when stdin is piped.
 * Use this for all ink.render() calls to ensure piped input works correctly.
 *
 * @param exitOnCtrlC  Whether Ctrl+C exits the process (usually false for dialogs)
 */
export function getBaseRenderOptions(exitOnCtrlC = false): RenderOptions {
  const stdin = getStdinOverride()
  const options: RenderOptions = { exitOnCtrlC }
  if (stdin) options.stdin = stdin
  return options
}

/** @internal — reset cache for tests */
export function _resetStdinOverrideForTesting(): void {
  cachedStdinOverride = null
}
