/**
 * Internal write timestamp tracking — adapted from CC's utils/settings/internalWrites.ts
 *
 * Lets settings.ts mark a file write BEFORE it happens, so the file watcher
 * (chokidar in changeDetector.ts) can distinguish own writes from external edits.
 * Mark is consumed on match (one-shot suppression).
 */

const timestamps = new Map<string, number>()

export function markInternalWrite(path: string): void {
  timestamps.set(path, Date.now())
}

export function consumeInternalWrite(path: string, windowMs: number): boolean {
  const ts = timestamps.get(path)
  if (ts !== undefined && Date.now() - ts < windowMs) {
    timestamps.delete(path)
    return true
  }
  return false
}

export function clearInternalWrites(): void {
  timestamps.clear()
}
