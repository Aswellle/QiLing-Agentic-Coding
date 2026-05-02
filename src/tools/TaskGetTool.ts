import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'
import { getTask, openBlockers } from '../services/tasks/store'

const inputSchema = z.object({
  taskId: z.string().describe('The task ID to retrieve (e.g. "tabc12345")'),
})

type Input = z.infer<typeof inputSchema>

export const TaskGetTool: Tool<Input> = {
  name: 'TaskGet',

  description:
    'Retrieve full details of a single task by ID, including its complete description, ' +
    'current status, owner, dependency links (blocks/blockedBy), and any output log. ' +
    'Use before starting work on a task to get complete context.',

  inputSchema,

  checkPermissions(): PermissionDecision { return { type: 'allow' } },

  async call(input: Input, _ctx: ToolContext): Promise<ToolResult> {
    const task = getTask(input.taskId)

    if (!task) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ task: null, error: `Task '${input.taskId}' not found` }) }],
        isError: true,
      }
    }

    const detail = {
      id: task.id,
      subject: task.subject,
      description: task.description,
      status: task.status,
      owner: task.owner ?? null,
      activeForm: task.activeForm ?? null,
      blocks: task.blocks,
      blockedBy: task.blockedBy,
      openBlockers: openBlockers(task),
      metadata: task.metadata,
      outputLines: task.output.length,
      createdAt: new Date(task.createdAt).toISOString(),
      updatedAt: new Date(task.updatedAt).toISOString(),
    }

    return {
      content: [{ type: 'text', text: JSON.stringify({ task: detail }) }],
    }
  },

  toDefinition() {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object' as const,
        properties: {
          taskId: { type: 'string', description: 'Task ID to retrieve' },
        },
        required: ['taskId'],
      },
    }
  },
}
