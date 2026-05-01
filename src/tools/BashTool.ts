import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, ToolDefinition, PermissionDecision } from '../types/tool'
import { classifyBashCommand } from '../permissions/classifier'

const inputSchema = z.object({
  command: z.string().describe('The shell command to execute'),
  timeout: z.number().int().default(120000).describe('Timeout in milliseconds (default 120s)'),
  description: z.string().optional().describe('Human-readable description of what this command does'),
})

type Input = z.infer<typeof inputSchema>

export const BashTool: Tool<Input> = {
  name: 'Bash',
  description:
    'Execute a shell command in the current working directory. ' +
    'Returns stdout and stderr. Commands run with a 120-second timeout by default. ' +
    'Available on Unix/macOS/WSL. Use PowerShell tool for Windows-native commands.',
  inputSchema,

  checkPermissions(input: Input): PermissionDecision {
    const { level, reason } = classifyBashCommand(input.command)
    if (level === 'safe') {
      return { type: 'allow' }
    }
    const prefix = level === 'high' ? '🔴 高风险' : level === 'medium' ? '🟡 中等风险' : '🟢 低风险'
    return {
      type: 'ask',
      description: `${prefix}: ${reason}\n\n  ${input.command}`,
    }
  },

  async call(input: Input, context: ToolContext): Promise<ToolResult> {
    const timeout = input.timeout ?? 120000

    try {
      const proc = Bun.spawn(['bash', '-c', input.command], {
        cwd: context.workingDir,
        stdout: 'pipe',
        stderr: 'pipe',
        env: { ...process.env },
      })

      const timeoutId = setTimeout(() => {
        proc.kill()
      }, timeout)

      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ])
      clearTimeout(timeoutId)

      const output = buildOutput(stdout, stderr, exitCode)
      return {
        content: [{ type: 'text', text: output }],
        isError: exitCode !== 0,
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Failed to execute command: ${error instanceof Error ? error.message : String(error)}` }],
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
          command: { type: 'string', description: 'Shell command to execute' },
          timeout: { type: 'integer', description: 'Timeout in milliseconds', default: 120000 },
          description: { type: 'string', description: 'What this command does' },
        },
        required: ['command'],
      },
    }
  },
}

function buildOutput(stdout: string, stderr: string, exitCode: number): string {
  const parts: string[] = []
  if (stdout.trim()) parts.push(stdout.trimEnd())
  if (stderr.trim()) parts.push(`[stderr]\n${stderr.trimEnd()}`)
  if (exitCode !== 0) parts.push(`[exit code: ${exitCode}]`)
  return parts.join('\n') || '(no output)'
}
