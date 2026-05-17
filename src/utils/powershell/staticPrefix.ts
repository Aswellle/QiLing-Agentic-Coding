/**
 * PowerShell static command prefix extraction.
 *
 * Provides a best-guess "don't ask again" prefix suggestion for the
 * permission dialog. Simplified port from CC's staticPrefix.ts —
 * the fig-spec registry integration is omitted since QiLing does not
 * ship those specs.
 */

import { NEVER_SUGGEST } from './dangerousCmdlets'
import {
  getAllCommands,
  type ParsedCommandElement,
  parsePowerShellCommand,
} from './parser'

/**
 * Extract a static prefix from a single parsed command element.
 * Returns null for commands we won't suggest (shells, eval cmdlets, path-like
 * invocations).
 */
function extractPrefixFromElement(
  cmd: ParsedCommandElement,
): string | null {
  if (cmd.nameType === 'application') {
    return null
  }

  const name = cmd.name
  if (!name) return null

  if (NEVER_SUGGEST.has(name.toLowerCase())) {
    return null
  }

  // Cmdlets (Verb-Noun): the name alone is the right prefix granularity.
  if (cmd.nameType === 'cmdlet') {
    return name
  }

  // For external commands: only suggest if all args are literals
  if (cmd.elementTypes?.[0] !== 'StringConstant') {
    return null
  }
  for (let i = 0; i < cmd.args.length; i++) {
    const t = cmd.elementTypes[i + 1]
    if (t !== 'StringConstant' && t !== 'Parameter') {
      return null
    }
  }

  // Return just the command name for external commands without a spec walker
  return name
}

/**
 * Extract a prefix suggestion for a PowerShell command.
 */
export async function getCommandPrefixStatic(
  command: string,
): Promise<{ commandPrefix: string | null } | null> {
  const parsed = await parsePowerShellCommand(command)
  if (!parsed.valid) {
    return null
  }

  const firstCommand = getAllCommands(parsed).find(
    cmd => cmd.elementType === 'CommandAst',
  )
  if (!firstCommand) {
    return { commandPrefix: null }
  }

  return { commandPrefix: extractPrefixFromElement(firstCommand) }
}
