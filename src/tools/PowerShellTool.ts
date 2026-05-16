import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, ToolDefinition, PermissionDecision } from '../types/tool'
import { EndTruncatingAccumulator } from '../utils/stringUtils'
import { getDestructiveCommandWarningPS } from './PowerShellTool/destructiveCommandWarning'

const DEFAULT_PS_TIMEOUT_MS = parseInt(process.env.BASH_DEFAULT_TIMEOUT_MS ?? '', 10) || 120_000
const MAX_PS_TIMEOUT_MS = parseInt(process.env.BASH_MAX_TIMEOUT_MS ?? '', 10) || 600_000
const MAX_PS_OUTPUT_CHARS = 100_000

const inputSchema = z.object({
  command: z.string().describe('The PowerShell command to execute'),
  description: z.string().optional().describe('Clear, concise description of what this command does in active voice.'),
  timeout: z.number().optional().describe(
    `Optional timeout in milliseconds (max ${MAX_PS_TIMEOUT_MS}ms / ${MAX_PS_TIMEOUT_MS / 60000} minutes). ` +
    `By default, your command will timeout after ${DEFAULT_PS_TIMEOUT_MS}ms (${DEFAULT_PS_TIMEOUT_MS / 60000} minutes).`
  ),
  run_in_background: z.boolean().optional().describe(
    'Set to true to run the command in the background. Only use this if you do not need the result immediately and are OK being notified when it completes later.'
  ),
  dangerouslyDisableSandbox: z.boolean().optional().describe(
    'Set this to true to dangerously override sandbox mode and run commands without sandboxing. Only use when explicitly requested by the user.'
  ),
})

type Input = z.infer<typeof inputSchema>

export const PowerShellTool: Tool<Input> = {
  name: 'PowerShell',
  description:
    'Executes a given PowerShell command with optional timeout. Working directory persists between commands; shell state does not.\n\n' +
    'IMPORTANT: This tool is for terminal operations via PowerShell: git, npm, docker, and PS cmdlets. ' +
    'DO NOT use it for file operations (reading, writing, editing, searching, finding files) — use the specialized tools for this instead.\n\n' +
    '# Instructions\n' +
    ' - If the command will create new directories or files, first use `Get-ChildItem` to verify the parent directory exists.\n' +
    ' - Always quote file paths that contain spaces with double quotes.\n' +
    ' - Try to maintain your current working directory throughout the session by using absolute paths and avoiding usage of `cd`.\n' +
    ` - You may specify an optional timeout in milliseconds (max ${MAX_PS_TIMEOUT_MS}ms / ${MAX_PS_TIMEOUT_MS / 60000} minutes). By default, your command will timeout after ${DEFAULT_PS_TIMEOUT_MS}ms.\n` +
    ' - You can use the `run_in_background` parameter to run the command in the background.\n' +
    ' - Avoid unnecessary `Start-Sleep` commands.\n' +
    ' - For git commands:\n' +
    '  - Prefer to create a new commit rather than amending an existing commit.\n' +
    '  - Never skip hooks (--no-verify) unless the user has explicitly asked for it.\n',
  inputSchema,

  checkPermissions(input: Input): PermissionDecision {
    const destructiveWarning = getDestructiveCommandWarningPS(input.command)
    if (destructiveWarning) {
      return {
        type: 'ask',
        description: `⚠️  ${destructiveWarning}\n\nRun PowerShell command:\n  ${input.command}`,
      }
    }
    return { type: 'ask', description: `Run PowerShell command:\n  ${input.command}` }
  },

  async call(input: Input, context: ToolContext): Promise<ToolResult> {
    const timeout = Math.min(
      Math.max(input.timeout ?? DEFAULT_PS_TIMEOUT_MS, 1_000),
      MAX_PS_TIMEOUT_MS
    )

    // Try PowerShell Core (pwsh) first, fall back to Windows PowerShell
    const psExe = await findPowerShell()

    if (input.run_in_background) {
      try {
        const proc = Bun.spawn(
          [psExe, '-NonInteractive', '-NoProfile', '-Command', input.command],
          { cwd: context.workingDir, env: { ...process.env }, stdout: 'pipe', stderr: 'pipe' }
        )
        void proc.exited.catch(() => {})
        return {
          content: [{ type: 'text', text: `Background PowerShell command started (PID: ${proc.pid})\nCommand: ${input.command}` }],
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Failed to start background command: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        }
      }
    }

    try {
      const proc = Bun.spawn(
        [psExe, '-NonInteractive', '-NoProfile', '-Command', input.command],
        {
          cwd: context.workingDir,
          stdout: 'pipe',
          stderr: 'pipe',
          env: { ...process.env },
        }
      )

      let timedOut = false
      const timeoutId = setTimeout(() => { timedOut = true; proc.kill() }, timeout)

      const stdoutAcc = new EndTruncatingAccumulator(MAX_PS_OUTPUT_CHARS)
      const stderrAcc = new EndTruncatingAccumulator(Math.floor(MAX_PS_OUTPUT_CHARS / 4))

      const [, , exitCode] = await Promise.all([
        (async () => { stdoutAcc.append(await new Response(proc.stdout).text()) })(),
        (async () => { stderrAcc.append(await new Response(proc.stderr).text()) })(),
        proc.exited,
      ])
      clearTimeout(timeoutId)

      if (timedOut) {
        const parts = ['Command timed out after ' + timeout + 'ms']
        if (stdoutAcc.length > 0) parts.push(stdoutAcc.toString())
        return { content: [{ type: 'text', text: parts.join('\n') }], isError: true }
      }

      const parts: string[] = []
      if (stdoutAcc.toString().trim()) parts.push(stdoutAcc.toString().trimEnd())
      if (stderrAcc.toString().trim()) parts.push(`[stderr]\n${stderrAcc.toString().trimEnd()}`)
      if ((exitCode ?? 0) !== 0) parts.push(`[exit code: ${exitCode}]`)

      return {
        content: [{ type: 'text', text: parts.join('\n') || '(no output)' }],
        isError: (exitCode ?? 0) !== 0,
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Failed to execute PowerShell: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      }
    }
  },

  toDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'PowerShell command to execute' },
          timeout: { type: 'integer', description: 'Timeout in milliseconds', default: 120000 },
          description: { type: 'string', description: 'What this command does' },
        },
        required: ['command'],
      },
    }
  },
}

let cachedPsPath: string | null = null
async function findPowerShell(): Promise<string> {
  if (cachedPsPath) return cachedPsPath
  for (const exe of ['pwsh', 'pwsh.exe', 'powershell', 'powershell.exe']) {
    try {
      const proc = Bun.spawn(process.platform === 'win32' ? ['where', exe] : ['which', exe], {
        stdout: 'pipe', stderr: 'pipe',
      })
      await proc.exited
      if (proc.exitCode === 0) {
        cachedPsPath = exe
        return exe
      }
    } catch { /* continue */ }
  }
  cachedPsPath = 'powershell.exe'
  return cachedPsPath
}
