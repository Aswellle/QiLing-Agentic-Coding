import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'
import { listCronJobs } from '../services/cron/scheduler'

const inputSchema = z.object({})

export const CronListTool: Tool<Record<string, never>> = {
  name: 'CronList',

  description: 'List all scheduled cron jobs in the current session.',

  inputSchema,

  checkPermissions(): PermissionDecision { return { type: 'allow' } },

  async call(_input: Record<string, never>, _ctx: ToolContext): Promise<ToolResult> {
    const jobs = listCronJobs()

    if (jobs.length === 0) {
      return { content: [{ type: 'text', text: 'No scheduled jobs. Use CronCreate to schedule one.' }] }
    }

    const lines = jobs.map(j => {
      const oneShot = !j.recurring ? ' (one-shot)' : ''
      const fired = j.firedCount > 0 ? ` [fired ${j.firedCount}×]` : ''
      const next = j.nextFireAt > 0 ? ` next: ${new Date(j.nextFireAt).toLocaleString()}` : ' (no more fires)'
      return `${j.id} — ${j.humanSchedule}${oneShot}${fired}${next}: ${j.prompt.slice(0, 50)}${j.prompt.length > 50 ? '…' : ''}`
    })

    const structured = jobs.map(j => ({
      id: j.id,
      cron: j.cron,
      humanSchedule: j.humanSchedule,
      prompt: j.prompt,
      recurring: j.recurring,
      firedCount: j.firedCount,
      nextFireAt: j.nextFireAt > 0 ? new Date(j.nextFireAt).toISOString() : null,
    }))

    return {
      content: [{
        type: 'text',
        text: `${jobs.length} scheduled job(s):\n${lines.join('\n')}\n\n${JSON.stringify({ jobs: structured })}`,
      }],
    }
  },

  toDefinition() {
    return {
      name: this.name,
      description: this.description,
      input_schema: { type: 'object' as const, properties: {}, required: [] },
    }
  },
}
