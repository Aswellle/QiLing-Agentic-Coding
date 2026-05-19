/**
 * Shell tool runtime utilities — adapted from CC's utils/shell/shellToolUtils.ts
 *
 * SHELL_TOOL_NAMES: list of all shell tool names
 * isPowerShellToolEnabled(): runtime gate for PowerShellTool
 *   - Windows-only
 *   - Opt-in via QILING_USE_POWERSHELL_TOOL=1 / CLAUDE_CODE_USE_POWERSHELL_TOOL=1
 */

export const BASH_TOOL_NAME = 'Bash'
export const POWERSHELL_TOOL_NAME = 'PowerShell'

/** All shell tool names — used by shell-detection logic */
export const SHELL_TOOL_NAMES: string[] = [BASH_TOOL_NAME, POWERSHELL_TOOL_NAME]

/**
 * Runtime gate for PowerShellTool.
 * Windows-only; requires explicit opt-in via env var on non-Windows.
 *
 * Used consistently across:
 * - tools.ts (tool-list visibility)
 * - processBashCommand (! routing)
 * - promptShellExecution (skill frontmatter routing)
 */
export function isPowerShellToolEnabled(): boolean {
  if (process.platform !== 'win32') return false
  const envVal = process.env.QILING_USE_POWERSHELL_TOOL
    ?? process.env.CLAUDE_CODE_USE_POWERSHELL_TOOL
  if (!envVal) return true  // default ON on Windows (like CC's ant behavior)
  return envVal !== '0' && envVal.toLowerCase() !== 'false'
}
