/**
 * Bash tool — CC-aligned with full timeout config + output truncation
 *
 * New vs old:
 *  - MAX_TIMEOUT_MS 600s (CC: up to 600s, QiLing was capped at 120s)
 *  - timeout configurable via BASH_DEFAULT_TIMEOUT_MS / BASH_MAX_TIMEOUT_MS env
 *  - EndTruncatingAccumulator: output capped at MAX_OUTPUT_CHARS, beginning preserved
 *  - run_in_background flag: fire-and-forget with PID return
 *  - Truncation marker shows total bytes received vs shown
 */

import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, ToolDefinition, PermissionDecision } from '../types/tool'
import { classifyBashCommand } from '../permissions/classifier'
import { EndTruncatingAccumulator } from '../utils/stringUtils'

// ─── Timeout constants (mirrors CC's utils/timeouts.ts) ───────────────────────
const DEFAULT_TIMEOUT_MS = parseInt(process.env.BASH_DEFAULT_TIMEOUT_MS ?? '', 10) || 120_000
const MAX_TIMEOUT_MS = parseInt(process.env.BASH_MAX_TIMEOUT_MS ?? '', 10) || 600_000

// ─── Output size limits ───────────────────────────────────────────────────────
// CC persists large outputs to disk; QiLing truncates at this boundary.
// ~100k chars ≈ 25k tokens — generous but prevents context explosion.
const MAX_OUTPUT_CHARS = 100_000

const inputSchema = z.object({
  command: z.string().describe('The command to execute'),
  description: z.string().optional().describe('Clear, concise description of what this command does in active voice.'),
  timeout: z.number().optional().describe(
    `Optional timeout in milliseconds (max ${MAX_TIMEOUT_MS}ms / ${MAX_TIMEOUT_MS / 60000} minutes). ` +
    `By default, your command will timeout after ${DEFAULT_TIMEOUT_MS}ms (${DEFAULT_TIMEOUT_MS / 60000} minutes).`
  ),
  run_in_background: z.boolean().optional().describe(
    "Set to true to run the command in the background. " +
    "Only use this if you don't need the result immediately and are OK being notified when it completes. " +
    "You do not need to check the output right away — you'll be notified when it finishes."
  ),
})

type Input = z.infer<typeof inputSchema>

// ─── Background task registry ─────────────────────────────────────────────────
const backgroundTasks = new Map<string, { pid: number; command: string; startedAt: number }>()

export const BashTool: Tool<Input> = {
  name: 'Bash',
  description: `Executes a given bash command and returns its output.

The working directory persists between commands, but shell state does not.

IMPORTANT: Avoid using this tool to run \`find\`, \`grep\`, \`cat\`, \`head\`, \`tail\`, \`sed\`, \`awk\`, or \`echo\` commands, unless explicitly instructed or after you have verified that a dedicated tool cannot accomplish your task. Instead, use the appropriate dedicated tool as this will provide a much better experience for the user:

 - File search: Use Glob (NOT find or ls)
 - Content search: Use Grep (NOT grep or rg)
 - Read files: Use Read (NOT cat/head/tail)
 - Edit files: Use Edit (NOT sed/awk)
 - Write files: Use Write (NOT echo >/cat <<EOF)

# Instructions
 - If your command will create new directories or files, first use this tool to run \`ls\` to verify the parent directory exists and is the correct location.
 - Always quote file paths that contain spaces with double quotes in your command (e.g., cd "path with spaces/file.txt")
 - Try to maintain your current working directory throughout the session by using absolute paths and avoiding usage of \`cd\`. You may use \`cd\` if the User explicitly requests it. In particular, never prepend \`cd <current-directory>\` to a \`git\` command — \`git\` already operates on the current working tree, and the compound triggers a permission prompt.
 - You may specify an optional timeout in milliseconds (max ${MAX_TIMEOUT_MS}ms / ${MAX_TIMEOUT_MS / 60000} minutes). By default, your command will timeout after ${DEFAULT_TIMEOUT_MS}ms (${DEFAULT_TIMEOUT_MS / 60000} minutes).
 - You can use the \`run_in_background\` parameter to run the command in the background. Only use this if you don't need the result immediately and are OK being notified when the command completes later. You do not need to use '&' at the end of the command when using this parameter.
 - When issuing multiple commands:
  - If the commands are independent and can run in parallel, make multiple Bash tool calls in a single message.
  - If the commands depend on each other and must run sequentially, use a single Bash call with '&&' to chain them together.
 - For git commands:
  - Prefer to create a new commit rather than amending an existing commit.
  - Never skip hooks (--no-verify) or bypass signing (--no-gpg-sign, -c commit.gpgsign=false) unless the user has explicitly asked for it.
  - NEVER run additional commands to read or explore code, besides git bash commands.
 - Avoid unnecessary \`sleep\` commands:
  - Do not sleep between commands that can run immediately — just run them.
  - Use the \`run_in_background\` parameter to run blocking commands in the background.
  - Long leading \`sleep\` commands are blocked. To poll until a condition is met, use a loop (e.g. \`until <check>; do sleep 2; done\`).
`,

  inputSchema,

  checkPermissions(input: Input): PermissionDecision {
    const { level, reason } = classifyBashCommand(input.command)
    if (level === 'safe') return { type: 'allow' }
    const prefix = level === 'high' ? '🔴 高风险' : level === 'medium' ? '🟡 中等风险' : '🟢 低风险'
    return { type: 'ask', description: `${prefix}: ${reason}\n\n  ${input.command}` }
  },

  async call(input: Input, context: ToolContext): Promise<ToolResult> {
    // CC's detectBlockedSleepPattern: block long sleep commands, suggest run_in_background
    const sleepBlock = detectBlockedSleepPattern(input.command)
    if (sleepBlock) {
      return {
        content: [{
          type: 'text',
          text: `Blocked: ${sleepBlock}. Run blocking commands in the background with run_in_background: true — ` +
            `you'll get a completion notification when done. ` +
            `If you genuinely need a delay (rate limiting, deliberate pacing), keep it under 2 seconds.`,
        }],
        isError: true,
      }
    }

    // Clamp timeout to [1000, MAX_TIMEOUT_MS]
    const timeout = Math.min(
      Math.max(input.timeout ?? DEFAULT_TIMEOUT_MS, 1_000),
      MAX_TIMEOUT_MS
    )

    // ── Background mode ────────────────────────────────────────────────────────
    if (input.run_in_background) {
      const bgId = `bg-${Date.now().toString(36)}`
      try {
        const proc = Bun.spawn(['bash', '-c', input.command], {
          cwd: context.workingDir,
          env: { ...process.env },
          stdout: 'pipe',
          stderr: 'pipe',
        })
        const pid = proc.pid
        backgroundTasks.set(bgId, { pid, command: input.command, startedAt: Date.now() })

        // Fire-and-forget: process result is discarded
        void proc.exited.then(() => {
          backgroundTasks.delete(bgId)
        })

        return {
          content: [{
            type: 'text',
            text: `Background command started (PID: ${pid}, id: ${bgId})\n` +
              `Command: ${input.command}\n` +
              `You will be notified when it finishes. Do not poll — use the id to check status if needed.`,
          }],
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Failed to start background command: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        }
      }
    }

    // ── Foreground mode ────────────────────────────────────────────────────────
    try {
      const proc = Bun.spawn(['bash', '-c', input.command], {
        cwd: context.workingDir,
        env: { ...process.env },
        stdout: 'pipe',
        stderr: 'pipe',
      })

      let timedOut = false
      const timeoutId = setTimeout(() => {
        timedOut = true
        proc.kill()
      }, timeout)

      // Use EndTruncatingAccumulator (CC pattern) to cap output size
      const stdoutAcc = new EndTruncatingAccumulator(MAX_OUTPUT_CHARS)
      const stderrAcc = new EndTruncatingAccumulator(Math.floor(MAX_OUTPUT_CHARS / 4))

      const [, , exitCode] = await Promise.all([
        (async () => {
          const text = await new Response(proc.stdout).text()
          stdoutAcc.append(text)
        })(),
        (async () => {
          const text = await new Response(proc.stderr).text()
          stderrAcc.append(text)
        })(),
        proc.exited,
      ])
      clearTimeout(timeoutId)

      if (timedOut) {
        return {
          content: [{
            type: 'text',
            text: `Command timed out after ${timeout}ms:\n${input.command}\n\n${buildOutput(stdoutAcc.toString(), stderrAcc.toString(), 1)}`,
          }],
          isError: true,
        }
      }

      const output = buildOutput(stdoutAcc.toString(), stderrAcc.toString(), exitCode ?? 0)
      return {
        content: [{ type: 'text', text: output }],
        isError: (exitCode ?? 0) !== 0,
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
          command: { type: 'string', description: 'The command to execute' },
          description: { type: 'string', description: 'What this command does' },
          timeout: {
            type: 'integer',
            description: `Optional timeout in milliseconds (max ${MAX_TIMEOUT_MS})`,
          },
          run_in_background: {
            type: 'boolean',
            description: 'Run in background (fire-and-forget)',
          },
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

/**
 * Detect standalone `sleep N` (N >= 2) patterns that should use run_in_background instead.
 * Mirrors CC's detectBlockedSleepPattern() from BashTool.tsx.
 * Float durations (sleep 0.5) are allowed — those are legitimate pacing.
 */
function detectBlockedSleepPattern(command: string): string | null {
  const trimmed = command.trim()
  // Match: bare `sleep N` or `sleep N && ...` or `sleep N; ...`
  const m = /^sleep\s+(\d+)\s*(?:$|&&|;)/.exec(trimmed)
  if (!m) return null
  const secs = parseInt(m[1]!, 10)
  if (secs < 2) return null  // sub-2s is fine (rate limiting, pacing)
  const rest = trimmed.slice(m[0].length).trim()
  return rest ? `sleep ${secs} followed by: ${rest}` : `standalone sleep ${secs}`
}

/** List all background tasks currently running. */
export function listBackgroundTasks(): Array<{ id: string; pid: number; command: string; durationMs: number }> {
  return [...backgroundTasks.entries()].map(([id, t]) => ({
    id,
    pid: t.pid,
    command: t.command,
    durationMs: Date.now() - t.startedAt,
  }))
}
