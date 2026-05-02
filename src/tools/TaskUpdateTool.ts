import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'
import { updateTask } from '../services/tasks/store'

const inputSchema = z.object({
  taskId: z.string()
    .describe('The ID of the task to update'),
  subject: z.string().optional()
    .describe('New task title'),
  description: z.string().optional()
    .describe('New task description'),
  activeForm: z.string().optional()
    .describe('New spinner text for in_progress state'),
  status: z.enum(['pending', 'in_progress', 'completed', 'stopped', 'deleted']).optional()
    .describe(
      'New status. Use "deleted" to permanently remove. ' +
      'Set "in_progress" when you start work, "completed" only when FULLY done. ' +
      'Never mark completed if tests are failing or implementation is partial.'
    ),
  owner: z.string().optional()
    .describe('Assign to an agent or team member (e.g. "researcher", "coder")'),
  addBlocks: z.array(z.string()).optional()
    .describe('Task IDs that cannot start until THIS task completes'),
  addBlockedBy: z.array(z.string()).optional()
    .describe('Task IDs that must complete before THIS task can start'),
  metadata: z.record(z.unknown()).optional()
    .describe('Metadata keys to merge in. Set a key to null to delete it.'),
  appendOutput: z.string().optional()
    .describe('Append a line to this task\'s output log'),
})

type Input = z.infer<typeof inputSchema>

export const TaskUpdateTool: Tool<Input> = {
  name: 'TaskUpdate',

  description:
    'Update a task: change status, assign an owner, set dependencies, or append output notes. ' +
    'Common workflow:\n' +
    '  1. Mark in_progress BEFORE beginning work\n' +
    '  2. Mark completed ONLY after fully finishing (not if tests fail or work is partial)\n' +
    '  3. Set owner to claim a task\n' +
    '  4. After completing, call TaskList to find the next available task\n' +
    'Use status="deleted" to permanently remove a task.',

  inputSchema,

  checkPermissions(): PermissionDecision { return { type: 'allow' } },

  async call(input: Input, _ctx: ToolContext): Promise<ToolResult> {
    const result = updateTask(input.taskId, {
      subject: input.subject,
      description: input.description,
      activeForm: input.activeForm,
      status: input.status,
      owner: input.owner,
      addBlocks: input.addBlocks,
      addBlockedBy: input.addBlockedBy,
      metadata: input.metadata as Record<string, unknown> | undefined,
      appendOutput: input.appendOutput,
    })

    if (!result.success) {
      return {
        content: [{ type: 'text', text: `Error: ${result.error}` }],
        isError: true,
      }
    }

    const parts: string[] = [`Updated task #${input.taskId}`]
    if (result.updatedFields.length > 0) parts.push(result.updatedFields.join(', '))
    if (result.statusChange) {
      parts.push(`(${result.statusChange.from} → ${result.statusChange.to})`)
    }

    return {
      content: [{
        type: 'text',
        text: parts.join(' ') + '\n' + JSON.stringify(result),
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
          taskId: { type: 'string', description: 'Task ID to update' },
          subject: { type: 'string', description: 'New task title' },
          description: { type: 'string', description: 'New description' },
          activeForm: { type: 'string', description: 'Spinner text when in_progress' },
          status: {
            type: 'string',
            enum: ['pending', 'in_progress', 'completed', 'stopped', 'deleted'],
            description: 'New status',
          },
          owner: { type: 'string', description: 'Assign owner name' },
          addBlocks: { type: 'array', items: { type: 'string' }, description: 'Task IDs this blocks' },
          addBlockedBy: { type: 'array', items: { type: 'string' }, description: 'Task IDs blocking this' },
          metadata: { type: 'object', description: 'Metadata to merge (null value = delete key)' },
          appendOutput: { type: 'string', description: 'Append a log line to task output' },
        },
        required: ['taskId'],
      },
    }
  },
}
