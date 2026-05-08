/**
 * CLI argument parsing utilities — ported from CC's utils/cliArgs.ts (verbatim)
 *
 * Parse flags BEFORE Commander.js processes them.
 * Useful for settings/config flags that need to affect initialization.
 */

/**
 * Parse a CLI flag value early, before Commander.js processes arguments.
 * Supports both space-separated (--flag value) and equals-separated (--flag=value) syntax.
 */
export function eagerParseCliFlag(flagName: string, argv = process.argv): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg?.startsWith(`${flagName}=`)) return arg.slice(flagName.length + 1)
    if (arg === flagName && i + 1 < argv.length) return argv[i + 1]
  }
  return undefined
}
