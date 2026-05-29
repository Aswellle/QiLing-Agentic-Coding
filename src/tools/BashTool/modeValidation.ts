// FROM CC: tools/BashTool/modeValidation.ts (adapt-new, updated for CC type compat)
// Changed ToolPermissionContext source to Tool.ts for CC-ported permission files.
// Return type updated to PermissionResult (passthrough instead of null).

import { splitCommand_DEPRECATED } from '../../utils/bash/commands.js'
import type { ToolPermissionContext } from '../../Tool.js'
import type { PermissionResult } from '../../utils/permissions/PermissionResult.js'

const ACCEPT_EDITS_ALLOWED_COMMANDS = [
  'mkdir',
  'touch',
  'rm',
  'rmdir',
  'mv',
  'cp',
  'sed',
] as const

type FilesystemCommand = (typeof ACCEPT_EDITS_ALLOWED_COMMANDS)[number]

function isFilesystemCommand(command: string): command is FilesystemCommand {
  return ACCEPT_EDITS_ALLOWED_COMMANDS.includes(command as FilesystemCommand)
}

function validateCommandForMode(
  cmd: string,
  toolPermissionContext: ToolPermissionContext,
): PermissionResult | null {
  const trimmedCmd = cmd.trim()
  const [baseCmd] = trimmedCmd.split(/\s+/)

  if (!baseCmd) return null

  if (
    toolPermissionContext.mode === 'acceptEdits' &&
    isFilesystemCommand(baseCmd)
  ) {
    return { behavior: 'allow' }
  }

  return null
}

/**
 * Checks if commands should be handled differently based on the current permission mode.
 * Returns passthrough if no mode-specific handling applies.
 */
export function checkPermissionMode(
  input: { command: string },
  toolPermissionContext: ToolPermissionContext,
): PermissionResult {
  if (toolPermissionContext.mode === 'bypassPermissions') {
    return { behavior: 'passthrough', message: 'bypass permissions mode' }
  }
  if (toolPermissionContext.mode === 'dontAsk') {
    return { behavior: 'passthrough', message: 'dontAsk mode' }
  }

  const commands = splitCommand_DEPRECATED(input.command)

  for (const cmd of commands) {
    const result = validateCommandForMode(cmd, toolPermissionContext)
    if (result !== null) return result
  }

  return { behavior: 'passthrough', message: 'no mode-specific handling' }
}

export function getAutoAllowedCommands(
  mode: ToolPermissionContext['mode'],
): readonly string[] {
  return mode === 'acceptEdits' ? ACCEPT_EDITS_ALLOWED_COMMANDS : []
}
