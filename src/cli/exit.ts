/**
 * CLI exit helpers — adapted from CC's cli/exit.ts
 *
 * Consolidates the "print + exit" pattern for CLI subcommand handlers.
 * The `: never` return type allows TypeScript control-flow narrowing at call sites.
 */

export function cliError(msg?: string): never {
  if (msg) console.error(msg)
  process.exit(1)
  return undefined as never
}

export function cliOk(msg?: string): never {
  if (msg) process.stdout.write(msg + '\n')
  process.exit(0)
  return undefined as never
}
