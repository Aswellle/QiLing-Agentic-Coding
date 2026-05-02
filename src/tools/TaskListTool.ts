import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'
import { listTasks, openBlockers } from '../services/tasks/store'

const inputSchema = z.object({})

export const TaskListTool: Tool<Record<string, never>> = {
  name: 'TaskList',

  description:
    'List all tasks in the current session. Returns id, subject, status, owner, and ' +
    'any open (unresolved) blockers. ' +
    'Use this to find available work (pending, no owner, no open blockers), ' +
    'check overall progress, or identify what is blocking a task. ' +
    'Prefer working on tasks in ID order — earlier tasks often set context for later ones.',

  inputSchema,

  checkPermissions(): PermissionDecision { return { type: 'allow' } },

  async call(_input: Record<string, never>, _ctx: ToolContext): Promise<ToolResult> {
    const tasks = listTasks()

    if (tasks.length === 0) {
      return { content: [{ type: 'text', text: 'No tasks. Use TaskCreate to add tasks.' }] }
    }

    const lines = tasks.map(t => {
      const blockers = openBlockers(t)
      const blockedStr = blockers.length > 0 ? ` [blocked by: ${blockers.join(', ')}]` : ''
      const ownerStr = t.owner ? ` (${t.owner})` : ''
      return `#${t.id} [${t.status}] ${t.subject}${ownerStr}${blockedStr}`
    })

    const summary = [
      `${tasks.length} task(s):`,
      ...lines,
    ].join('\n')

    const structured = tasks.map(t => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      owner: t.owner,
      blockedBy: openBlockers(t),
    }))

    return {
      content: [{ type: 'text', text: summary + '\n\n' + JSON.stringify({ tasks: structured }) }],
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
