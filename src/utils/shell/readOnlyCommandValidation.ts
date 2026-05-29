// FROM CC: utils/shell/readOnlyCommandValidation.ts (stub)
// Full CC file exports READONLY_COMMAND_REGEXES, validateFlags, GIT_READ_ONLY_COMMANDS, etc.
// QiLing stub: only containsVulnerableUncPath ported (needed by filesystem.ts / pathValidation.ts).
// Full port deferred — needed for readOnlyValidation.ts.

/**
 * Checks if a path contains a Windows UNC path that could be used for WebDAV attacks.
 * Example: \\server\share, //server/share
 */
export function containsVulnerableUncPath(path: string): boolean {
  return /^(\\\\|\/\/)/.test(path)
}

// CC-compat type stubs for readOnlyValidation.ts
export type FlagArgType = 'none' | 'string' | 'number' | 'char' | string

export const EXTERNAL_READONLY_COMMANDS: string[] = []
export const GIT_READ_ONLY_COMMANDS: Record<string, unknown> = {}
export const RIPGREP_READ_ONLY_COMMANDS: Record<string, unknown> = {}
export const PYRIGHT_READ_ONLY_COMMANDS: Record<string, unknown> = {}
export const DOCKER_READ_ONLY_COMMANDS: Record<string, unknown> = {}
export const GH_READ_ONLY_COMMANDS: Record<string, unknown> = {}

export function validateFlags(
  _tokens: string[],
  _commandTokens: number,
  _config: unknown,
  _opts?: unknown,
): boolean {
  return true
}
