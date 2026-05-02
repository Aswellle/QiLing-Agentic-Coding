import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'
import { stopTask, getTask } from '../services/tasks/store'

const inputSchema = z.object({
  taskId: z.string().describe('ID of the task to stop'),
})

type Input = z.infer<typeof inputSchema>

export const TaskStopTool: Tool<Input> = {
  name: 'TaskStop',

  description:
    'Stop a running or pending task, marking it as "stopped". ' +
    'Use when a task needs to be cancelled — for example if it is blocked indefinitely, ' +
    'superseded by another approach, or if an agent running it should halt. ' +
    'Cannot stop tasks that are already completed or stopped.',

  inputSchema,

  checkPermissions(): PermissionDecision { return { type: 'allow' } },

  async call(input: Input, _ctx: ToolContext): Promise<ToolResult> {
    const task = getTask(input.taskId)
    if (!task) {
      return {
        content: [{ type: 'text', text: `Error: Task '${input.taskId}' not found` }],
        isError: true,
      }
    }

    const result = stopTask(input.taskId)
    if (!result.success) {
      return {
        content: [{ type: 'text', text: `Error: ${result.error}` }],
        isError: true,
      }
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          message: `Task stopped`,
          task_id: input.taskId,
          subject: task.subject,
          previous_status: task.status,
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
          taskId: { type: 'string', description: 'ID of task to stop' },
        },
        required: ['taskId'],
      },
    }
  },
}
