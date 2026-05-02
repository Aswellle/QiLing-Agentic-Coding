import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'

const MAX_SLEEP_MS = 30 * 60 * 1000  // 30 minutes hard cap

const inputSchema = z.object({
  duration: z.string().describe(
    'How long to wait. Accepts:\n' +
    '  "30s"  = 30 seconds\n' +
    '  "5m"   = 5 minutes\n' +
    '  "1h"   = 1 hour (capped at 30 min)\n' +
    '  "1500" = 1500 milliseconds\n' +
    'Max: 30 minutes.'
  ),
})

type Input = z.infer<typeof inputSchema>

function parseDuration(s: string): number | null {
  const trimmed = s.trim().toLowerCase()
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10)
  const match = trimmed.match(/^(\d+(?:\.\d+)?)(ms|s|m|h)$/)
  if (!match) return null
  const n = parseFloat(match[1])
  switch (match[2]) {
    case 'ms': return Math.round(n)
    case 's':  return Math.round(n * 1_000)
    case 'm':  return Math.round(n * 60_000)
    case 'h':  return Math.round(n * 3_600_000)
    default:   return null
  }
}

export const SleepTool: Tool<Input> = {
  name: 'Sleep',

  description:
    'Wait for a specified duration before continuing. ' +
    'Prefer this over Bash("sleep N") — it does not occupy a shell process. ' +
    'Use when waiting for an external process, a rate-limit window, or a fixed delay ' +
    'between polling steps. Max 30 minutes. ' +
    'For longer waits, use CronCreate with a one-shot job instead.',

  inputSchema,

  checkPermissions(): PermissionDecision { return { type: 'allow' } },

  async call(input: Input, _ctx: ToolContext): Promise<ToolResult> {
    const ms = parseDuration(input.duration)
    if (ms === null || ms <= 0) {
      return {
        content: [{ type: 'text', text: `Error: Cannot parse duration '${input.duration}'. Use formats like "30s", "5m", "1h", or milliseconds.` }],
        isError: true,
      }
    }

    const capped = Math.min(ms, MAX_SLEEP_MS)
    const cappedNote = capped < ms ? ` (capped from ${input.duration})` : ''
    const humanMs = capped >= 60_000
      ? `${Math.round(capped / 60_000)}m ${Math.round((capped % 60_000) / 1000)}s`
      : `${Math.round(capped / 1000)}s`

    const start = Date.now()
    await Bun.sleep(capped)
    const actual = Date.now() - start

    return {
      content: [{
        type: 'text',
        text: `Slept ${humanMs}${cappedNote} (actual: ${actual}ms)`,
      }],
    }
  },

  toDefinition() {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object' as const,
        properties: {
          duration: {
            type: 'string',
            description: 'Duration: "30s", "5m", "1h", or milliseconds as string',
          },
        },
        required: ['duration'],
      },
    }
  },
}
