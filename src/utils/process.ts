/**
 * Process I/O utilities — ported from CC's utils/process.ts (verbatim)
 *
 * registerProcessOutputErrorHandlers(): prevents memory leaks when pipe is broken
 * (e.g., `qiling -p "..." | head -1` — stdout EPIPE triggers otherwise)
 */

function handleEPIPE(stream: NodeJS.WriteStream): (err: NodeJS.ErrnoException) => void {
  return (err: NodeJS.ErrnoException) => {
    if (err.code === 'EPIPE') stream.destroy()
  }
}

/** Register EPIPE handlers on stdout/stderr to prevent memory leaks on broken pipes. */
export function registerProcessOutputErrorHandlers(): void {
  process.stdout.on('error', handleEPIPE(process.stdout))
  process.stderr.on('error', handleEPIPE(process.stderr))
}

export function writeToStdout(data: string): void {
  if (!process.stdout.destroyed) process.stdout.write(data)
}

export function writeToStderr(data: string): void {
  if (!process.stderr.destroyed) process.stderr.write(data)
}

/** Write error to stderr and exit with code 1. */
export function exitWithError(message: string): never {
  console.error(message)
  process.exit(1)
}

/**
 * Wait for a stdin-like stream to produce data or close, with a timeout.
 * Returns true if timed out (no data), false on stream end.
 * Used in -p mode to detect real pipe vs inherited-but-idle stdin.
 */
export function peekForStdinData(
  stream: NodeJS.EventEmitter,
  ms: number,
): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    const done = (timedOut: boolean) => {
      clearTimeout(peek)
      stream.off('end', onEnd)
      stream.off('data', onFirstData)
      void resolve(timedOut)
    }
    const onEnd = () => done(false)
    const onFirstData = () => clearTimeout(peek)
    const peek = setTimeout(done, ms, true)
    stream.once('end', onEnd)
    stream.once('data', onFirstData)
  })
}
