import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'
import { getTask } from '../services/tasks/store'

const inputSchema = z.object({
  taskId: z.string().describe('ID of the task to read output from'),
  tail: z.number().int().min(1).max(200).default(50)
    .describe('Number of most recent output lines to return (default 50, max 200)'),
})

type Input = z.infer<typeof inputSchema>

export const TaskOutputTool: Tool<Input> = {
  name: 'TaskOutput',

  description:
    'Read the output log of a task — lines appended via TaskUpdate(appendOutput). ' +
    'Use this to check progress notes, error messages, or results that an agent ' +
    'logged while working on the task. Returns the most recent N lines.',

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

    const tail = input.tail ?? 50
    const lines = task.output.slice(-tail)
    const totalLines = task.output.length
    const truncated = totalLines > tail

    const header = [
      `Task #${task.id}: ${task.subject}`,
      `Status: ${task.status}${task.owner ? ` · Owner: ${task.owner}` : ''}`,
      `Output: ${totalLines} line(s)${truncated ? ` (showing last ${tail})` : ''}`,
      '─'.repeat(40),
    ].join('\n')

    const body = lines.length > 0 ? lines.join('\n') : '(no output yet)'

    return {
      content: [{ type: 'text', text: `${header}\n${body}` }],
    }
  },

  toDefinition() {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object' as const,
        properties: {
          taskId: { type: 'string', description: 'Task ID to read output from' },
          tail: {
            type: 'number',
            description: 'Number of most recent lines to return (default 50)',
            minimum: 1,
            maximum: 200,
            default: 50,
          },
        },
        required: ['taskId'],
      },
    }
  },
}
