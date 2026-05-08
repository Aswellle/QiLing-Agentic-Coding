import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, ToolDefinition, PermissionDecision } from '../types/tool'
import { EndTruncatingAccumulator } from '../utils/stringUtils'

const DEFAULT_PS_TIMEOUT_MS = parseInt(process.env.BASH_DEFAULT_TIMEOUT_MS ?? '', 10) || 120_000
const MAX_PS_TIMEOUT_MS = parseInt(process.env.BASH_MAX_TIMEOUT_MS ?? '', 10) || 600_000
const MAX_PS_OUTPUT_CHARS = 100_000

const inputSchema = z.object({
  command: z.string().describe('The PowerShell command to execute'),
  description: z.string().optional().describe('Clear, concise description of what this command does in active voice.'),
  timeout: z.number().optional().describe(
    `Optional timeout in milliseconds (max ${MAX_PS_TIMEOUT_MS}ms / ${MAX_PS_TIMEOUT_MS / 60000} minutes). ` +
    `By default, your command will timeout after ${DEFAULT_PS_TIMEOUT_MS}ms.`
  ),
  run_in_background: z.boolean().optional().describe(
    'Run the command in the background. Only use this if you do not need the result immediately.'
  ),
})

type Input = z.infer<typeof inputSchema>

const DESTRUCTIVE_PATTERNS = [
  /Remove-Item.*-Force/i,
  /rm\s+-Force/i,
  /Format-Volume/i,
  /\|\s*Remove-Item/i,
  /Clear-Disk/i,
]

export const PowerShellTool: Tool<Input> = {
  name: 'PowerShell',
  description:
    'Execute a PowerShell command. ' +
    'Returns stdout and stderr. Commands run with a 120-second timeout by default. ' +
    'Preferred for Windows systems. Use Bash tool on Unix/macOS.',
  inputSchema,

  checkPermissions(input: Input): PermissionDecision {
    for (const pattern of DESTRUCTIVE_PATTERNS) {
      if (pattern.test(input.command)) {
        return {
          type: 'ask',
          description: `⚠ Potentially destructive PowerShell command:\n  ${input.command}`,
        }
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
