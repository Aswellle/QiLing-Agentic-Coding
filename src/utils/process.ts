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
