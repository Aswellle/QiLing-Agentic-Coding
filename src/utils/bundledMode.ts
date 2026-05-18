/**
 * Bun runtime detection — direct port of CC's utils/bundledMode.ts
 *
 * isRunningWithBun(): true when executing via `bun` or Bun-compiled binary
 * isInBundledMode(): true only for Bun-compiled standalone executables
 *   (embedded files are present only in compiled binaries, not dev mode)
 */

export function isRunningWithBun(): boolean {
  return process.versions.bun !== undefined
}

export function isInBundledMode(): boolean {
  return (
    typeof Bun !== 'undefined' &&
    Array.isArray(Bun.embeddedFiles) &&
    Bun.embeddedFiles.length > 0
  )
}
