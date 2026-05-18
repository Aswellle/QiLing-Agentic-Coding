/**
 * Lazy lockfile accessor — direct port of CC's utils/lockfile.ts
 *
 * proper-lockfile depends on graceful-fs which monkey-patches fs on require (~8ms).
 * This module lazy-loads it only when a lock function is actually called.
 *
 * Falls back to a simple file-based lock if proper-lockfile is not installed.
 */

import { existsSync, writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

// ─── Simple fallback lock (no external dependency) ────────────────────────────

function simpleLock(file: string): () => Promise<void> {
  const lockPath = `${file}.lock`
  writeFileSync(lockPath, String(process.pid), 'utf-8')
  return async () => {
    try { unlinkSync(lockPath) } catch { /* ignore */ }
  }
}

function simpleCheck(file: string): boolean {
  return existsSync(`${file}.lock`)
}

// ─── Try proper-lockfile, fall back to simple ─────────────────────────────────

type LockOptions = { retries?: number; stale?: number }
type UnlockOptions = { realpath?: boolean }
type CheckOptions = { realpath?: boolean; stale?: number }

let _properLockfile: {
  lock: (f: string, opts?: LockOptions) => Promise<() => Promise<void>>
  lockSync: (f: string, opts?: LockOptions) => () => void
  unlock: (f: string, opts?: UnlockOptions) => Promise<void>
  check: (f: string, opts?: CheckOptions) => Promise<boolean>
} | null = null

function getProperLockfile() {
  if (_properLockfile !== null) return _properLockfile
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _properLockfile = require('proper-lockfile') as typeof _properLockfile
  } catch {
    _properLockfile = null
  }
  return _properLockfile
}

export async function lock(
  file: string,
  options?: LockOptions,
): Promise<() => Promise<void>> {
  const pl = getProperLockfile()
  if (pl) return pl.lock(file, options)
  return simpleLock(file)
}

export function lockSync(file: string, options?: LockOptions): () => void {
  const pl = getProperLockfile()
  if (pl) return pl.lockSync(file, options)
  const release = simpleLock(file)
  return () => { void release() }
}

export async function unlock(file: string, options?: UnlockOptions): Promise<void> {
  const pl = getProperLockfile()
  if (pl) return pl.unlock(file, options)
  try { unlinkSync(`${file}.lock`) } catch { /* ignore */ }
}

export async function check(file: string, options?: CheckOptions): Promise<boolean> {
  const pl = getProperLockfile()
  if (pl) return pl.check(file, options)
  return simpleCheck(file)
}
