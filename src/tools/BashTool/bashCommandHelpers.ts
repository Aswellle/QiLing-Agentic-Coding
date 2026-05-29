// FROM CC: tools/BashTool/bashCommandHelpers.ts (stub — pending ParsedCommand.ts port)
// Full logic requires utils/bash/ParsedCommand.ts + parser.ts (tree-sitter).
// Stubs checkCommandOperatorPermissions as passthrough.

import type { z } from 'zod'
import type { Node, PARSE_ABORTED } from '../../utils/bash/parser.js'
import type { PermissionResult } from '../../utils/permissions/PermissionResult.js'
import type { BashTool } from '../BashTool.js'

export type CommandIdentityCheckers = {
  isNormalizedCdCommand: (command: string) => boolean
  isNormalizedGitCommand: (command: string) => boolean
}

export async function checkCommandOperatorPermissions(
  _input: z.infer<typeof BashTool.inputSchema>,
  _bashToolHasPermissionFn: (
    input: z.infer<typeof BashTool.inputSchema>,
  ) => Promise<PermissionResult>,
  _checkers: CommandIdentityCheckers,
  _astRoot: Node | null | typeof PARSE_ABORTED,
): Promise<PermissionResult> {
  // Stub: full pipe/compound operator checking deferred (needs ParsedCommand.ts)
  return { behavior: 'passthrough', message: 'command operator check pending full port' }
}
