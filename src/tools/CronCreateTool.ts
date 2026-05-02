import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'
import { addCronJob, validateCron } from '../services/cron/scheduler'

const inputSchema = z.object({
  cron: z.string().describe(
    'Standard 5-field cron expression: "M H DoM Mon DoW"\n' +
    'Examples: "*/5 * * * *" (every 5 min), "0 9 * * 1" (Mon 9am), "30 14 * * *" (daily 2:30pm)\n' +
    'Supported syntax: * (any), n (exact), */n (every n), n-m (range), n,m (list)'
  ),
  prompt: z.string().describe(
    'The prompt to execute when this job fires. ' +
    'Should be a complete, self-contained instruction (not a reference to earlier context).'
  ),
  recurring: z.boolean().default(true).describe(
    'true (default) = fires on every matching time until deleted. ' +
    'false = fires once then auto-deletes (one-shot reminder).'
  ),
})

type Input = z.infer<typeof inputSchema>

export const CronCreateTool: Tool<Input> = {
  name: 'CronCreate',

  description:
    'Schedule a prompt to run automatically on a cron schedule. ' +
    'The job fires when the REPL is active and the cron time matches. ' +
    'Use for recurring checks ("every 5 min, check if tests pass"), ' +
    'one-shot reminders (recurring=false), or periodic monitoring. ' +
    'Max 50 concurrent jobs. Use CronList to see existing jobs, CronDelete to cancel.',

  inputSchema,

  checkPermissions(): PermissionDecision { return { type: 'allow' } },

  async call(input: Input, _ctx: ToolContext): Promise<ToolResult> {
    const validErr = validateCron(input.cron)
    if (validErr) {
      return {
        content: [{ type: 'text', text: `Error: ${validErr}` }],
        isError: true,
      }
    }

    const { job, error } = addCronJob(input.cron, input.prompt, input.recurring)
    if (error || !job) {
      return {
        content: [{ type: 'text', text: `Error: ${error}` }],
        isError: true,
      }
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          id: job.id,
          humanSchedule: job.humanSchedule,
          recurring: job.recurring,
          nextFireAt: new Date(job.nextFireAt).toISOString(),
        }),
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
          cron: { type: 'string', description: 'Cron expression (5 fields)' },
          prompt: { type: 'string', description: 'Prompt to run when job fires' },
          recurring: {
            type: 'boolean',
            description: 'true = repeat, false = one-shot (default true)',
            default: true,
          },
        },
        required: ['cron', 'prompt'],
      },
    }
  },
}
