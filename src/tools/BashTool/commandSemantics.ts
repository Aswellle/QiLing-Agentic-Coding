/**
 * Command exit-code semantics — ported from CC's BashTool/commandSemantics.ts
 *
 * Many commands use non-zero exit codes to indicate informational results
 * (not errors). For example, grep exits 1 when no matches found, which is
 * not an error — it's information.
 */

export type CommandSemantic = (
  exitCode: number,
  stdout: string,
  stderr: string,
) => { isError: boolean; message?: string }

const DEFAULT_SEMANTIC: CommandSemantic = (exitCode) => ({
  isError: exitCode !== 0,
  message: exitCode !== 0 ? `Command failed with exit code ${exitCode}` : undefined,
})

const COMMAND_SEMANTICS = new Map<string, CommandSemantic>([
  // grep/rg: 0=match, 1=no match, 2+=error
  ['grep', (code) => ({ isError: code >= 2, message: code === 1 ? 'No matches found' : undefined })],
  ['rg',   (code) => ({ isError: code >= 2, message: code === 1 ? 'No matches found' : undefined })],
  // find: 1=partial (inaccessible dirs), 2+=error
  ['find', (code) => ({ isError: code >= 2, message: code === 1 ? 'Some directories were inaccessible' : undefined })],
  // diff: 0=same, 1=different, 2+=error
  ['diff', (code) => ({ isError: code >= 2, message: code === 1 ? 'Files differ' : undefined })],
  // test/[: 0=true, 1=false, 2+=error
  ['test', (code) => ({ isError: code >= 2, message: code === 1 ? 'Condition is false' : undefined })],
  ['[',    (code) => ({ isError: code >= 2, message: code === 1 ? 'Condition is false' : undefined })],
  // robocopy: 0-7 are success levels, 8+ are errors
  ['robocopy', (code) => ({ isError: code >= 8, message: code < 8 ? undefined : `Robocopy error (exit ${code})` })],
])

function extractBaseCommand(command: string): string {
  // Handle pipes: take last segment's first word (it sets the exit code)
  const segments = command.split(/[|;]/)
  const lastSeg = (segments[segments.length - 1] ?? '').trim()
  return lastSeg.split(/\s+/)[0] ?? ''
}

export function interpretCommandResult(
  command: string,
  exitCode: number,
  stdout: string,
  stderr: string,
): { isError: boolean; message?: string } {
  const baseCmd = extractBaseCommand(command).toLowerCase()
  const semantic = COMMAND_SEMANTICS.get(baseCmd) ?? DEFAULT_SEMANTIC
  return semantic(exitCode, stdout, stderr)
}
