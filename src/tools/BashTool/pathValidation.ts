// FROM CC: tools/BashTool/pathValidation.ts (stub — 2049 lines, deferred)
// checkPathConstraints returns passthrough until full port.
// Full file needs filesystem.ts + many utils.
// LOC: path validation messages

import type { z } from 'zod'
import type { ToolPermissionContext } from '../../Tool.js'
import type { Redirect, SimpleCommand } from '../../utils/bash/ast.js'
import type { PermissionResult } from '../../utils/permissions/PermissionResult.js'
import type { BashTool } from '../BashTool.js'

export type PathCommand =
  | 'cd' | 'ls' | 'find' | 'mkdir' | 'touch' | 'rm' | 'rmdir'
  | 'mv' | 'cp' | 'cat' | 'head' | 'tail' | 'sort' | 'uniq'
  | 'wc' | 'cut' | 'paste' | 'column' | 'tr' | 'file' | 'stat'
  | 'diff' | 'awk' | 'strings' | 'hexdump' | 'od' | 'base64'
  | 'nl' | 'grep' | 'rg' | 'sed' | 'git' | 'jq'

export const COMMAND_OPERATION_TYPE: Partial<Record<PathCommand, 'read' | 'write' | 'create' | 'delete'>> = {}
export const PATH_EXTRACTORS: Partial<Record<PathCommand, (args: string[]) => string[]>> = {}

export function checkPathConstraints(
  _input: z.infer<typeof BashTool.inputSchema>,
  _cwd: string,
  _context: ToolPermissionContext,
  _compoundCommandHasCd?: boolean,
  _redirects?: Redirect[],
  _commands?: SimpleCommand[],
): PermissionResult {
  // Stub: full path validation deferred; permissive passthrough
  return { behavior: 'passthrough', message: 'path validation pending full port' }
}
