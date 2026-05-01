import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, ToolDefinition, PermissionDecision } from '../types/tool'

const inputSchema = z.object({
  command: z.string().describe('The PowerShell command to execute'),
  timeout: z.number().int().default(120000).describe('Timeout in milliseconds'),
  description: z.string().optional().describe('Human-readable description of what this command does'),
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
    const timeout = input.timeout ?? 120000

    // Try PowerShell Core (pwsh) first, fall back to Windows PowerShell
    const psExe = await findPowerShell()

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

      const timeoutId = setTimeout(() => proc.kill(), timeout)

      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ])
      clearTimeout(timeoutId)

      const parts: string[] = []
      if (stdout.trim()) parts.push(stdout.trimEnd())
      if (stderr.trim()) parts.push(`[stderr]\n${stderr.trimEnd()}`)
      if (exitCode !== 0) parts.push(`[exit code: ${exitCode}]`)

      return {
        content: [{ type: 'text', text: parts.join('\n') || '(no output)' }],
        isError: exitCode !== 0,
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
