/**
 * CLI argument parsing utilities — ported from CC's utils/cliArgs.ts (verbatim)
 *
 * Parse flags BEFORE Commander.js processes them.
 * Useful for settings/config flags that need to affect initialization.
 */

/** Parse a CLI flag value early. Supports --flag=value and --flag value syntax. */
export function eagerParseCliFlag(flagName: string, argv = process.argv): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg?.startsWith(`${flagName}=`)) return arg.slice(flagName.length + 1)
    if (arg === flagName && i + 1 < argv.length) return argv[i + 1]
  }
  return undefined
}

/**
 * Handle the standard Unix `--` separator in Commander.js with passThroughOptions().
 * When positional is "--", extracts the actual command from the rest array.
 * Ported from CC's utils/cliArgs.ts.
 */
export function extractArgsAfterDoubleDash(
  commandOrValue: string,
  args: string[] = [],
): { command: string; args: string[] } {
  if (commandOrValue === '--' && args.length > 0) {
    return { command: args[0]!, args: args.slice(1) }
  }
  return { command: commandOrValue, args }
}
