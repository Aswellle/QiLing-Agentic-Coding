/**
 * Stream JSON stdout guard — adapted from CC's utils/streamJsonStdoutGuard.ts
 *
 * For --output-format=stream-json (SDK mode): wraps process.stdout.write
 * so non-JSON lines are diverted to stderr instead of corrupting the NDJSON
 * stream that SDK clients are parsing.
 *
 * Any stray console.log, dependency banner, or debug print that isn't valid
 * JSON is diverted to stderr with STDOUT_GUARD_MARKER prefix.
 * Proper JSON lines pass through unchanged.
 */

import { registerCleanup } from './cleanupRegistry.js'
import { logForDebugging } from './log.js'

export const STDOUT_GUARD_MARKER = '[stdout-guard]'

let installed = false
let buffer = ''
let originalWrite: typeof process.stdout.write | null = null

function isJsonLine(line: string): boolean {
  if (line.length === 0) return true  // Empty lines are valid in NDJSON
  try {
    JSON.parse(line)
    return true
  } catch {
    return false
  }
}

/**
 * Install the stdout guard for stream-json output mode.
 * Idempotent — installing twice is a no-op.
 * Call before any stream-json output is emitted.
 */
export function installStreamJsonStdoutGuard(): void {
  if (installed) return
  installed = true
  originalWrite = process.stdout.write.bind(process.stdout)

  process.stdout.write = function (
    chunk: Uint8Array | string,
    encodingOrCb?: BufferEncoding | ((error?: Error | null) => void),
    cb?: (error?: Error | null) => void,
  ): boolean {
    const text = typeof chunk === 'string' ? chunk : (chunk as Buffer).toString('utf8')
    buffer += text

    let wrote = true
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''  // Keep the last incomplete line

    for (const line of lines) {
      if (isJsonLine(line)) {
        wrote = originalWrite!(line + '\n')
      } else {
        process.stderr.write(`${STDOUT_GUARD_MARKER} ${line}\n`)
        logForDebugging(
          `streamJsonStdoutGuard diverted non-JSON: ${line.slice(0, 200)}`,
        )
      }
    }

    const callback = typeof encodingOrCb === 'function' ? encodingOrCb : cb
    if (callback) queueMicrotask(() => callback())
    return wrote
  } as typeof process.stdout.write

  registerCleanup(async () => {
    if (buffer.length > 0) {
      if (originalWrite && isJsonLine(buffer)) {
        originalWrite(buffer + '\n')
      } else {
        process.stderr.write(`${STDOUT_GUARD_MARKER} ${buffer}\n`)
      }
      buffer = ''
    }
    if (originalWrite) {
      process.stdout.write = originalWrite
      originalWrite = null
    }
    installed = false
  })
}

/** @internal — reset for tests */
export function _resetStreamJsonStdoutGuardForTesting(): void {
  if (originalWrite) {
    process.stdout.write = originalWrite
    originalWrite = null
  }
  buffer = ''
  installed = false
}
