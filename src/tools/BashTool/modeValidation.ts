// FROM CC: tools/BashTool/modeValidation.ts
import type { ToolPermissionContext } from '../../state/AppStateStore.js'
import { splitCommand_DEPRECATED } from '../../utils/bash/commands.js'
import type { PermissionDecision } from '../../types/tool.js'

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
): PermissionDecision | null {
  const trimmedCmd = cmd.trim()
  const [baseCmd] = trimmedCmd.split(/\s+/)

  if (!baseCmd) return null

  if (
    toolPermissionContext.mode === 'acceptEdits' &&
    isFilesystemCommand(baseCmd)
  ) {
    return { type: 'allow' }
  }

  return null
}

/**
 * Checks if commands should be handled differently based on the current permission mode.
 * Returns null if no mode-specific handling applies (equivalent to CC's 'passthrough').
 */
export function checkPermissionMode(
  input: { command: string },
  toolPermissionContext: ToolPermissionContext,
): PermissionDecision | null {
  if (toolPermissionContext.mode === 'bypassPermissions') return null
  if (toolPermissionContext.mode === 'dontAsk') return null

  const commands = splitCommand_DEPRECATED(input.command)

  for (const cmd of commands) {
    const result = validateCommandForMode(cmd, toolPermissionContext)
    if (result !== null) return result
  }

  return null
}

export function getAutoAllowedCommands(
  mode: ToolPermissionContext['mode'],
): readonly string[] {
  return mode === 'acceptEdits' ? ACCEPT_EDITS_ALLOWED_COMMANDS : []
}
