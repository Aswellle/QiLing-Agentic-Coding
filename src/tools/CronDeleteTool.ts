import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'
import { removeCronJob, getCronJob } from '../services/cron/scheduler'

const inputSchema = z.object({
  id: z.string().describe('Job ID returned by CronCreate (e.g. "cron-abc123-xyz")'),
})

type Input = z.infer<typeof inputSchema>

export const CronDeleteTool: Tool<Input> = {
  name: 'CronDelete',

  description: 'Cancel a scheduled cron job by ID. Use CronList to find job IDs.',

  inputSchema,

  checkPermissions(): PermissionDecision { return { type: 'allow' } },

  async call(input: Input, _ctx: ToolContext): Promise<ToolResult> {
    const job = getCronJob(input.id)
    if (!job) {
      return {
        content: [{ type: 'text', text: `Error: Job '${input.id}' not found` }],
        isError: true,
      }
    }

    removeCronJob(input.id)
    return {
      content: [{
        type: 'text',
        text: `Cancelled job ${input.id} (${job.humanSchedule}: ${job.prompt.slice(0, 60)}${job.prompt.length > 60 ? '…' : ''})`,
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
          id: { type: 'string', description: 'Job ID to cancel' },
        },
        required: ['id'],
      },
    }
  },
}
