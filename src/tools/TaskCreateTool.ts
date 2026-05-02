import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'
import { createTask } from '../services/tasks/store'

const inputSchema = z.object({
  subject: z.string()
    .describe('Brief imperative title (e.g. "Fix authentication bug in login flow")'),
  description: z.string()
    .describe('What needs to be done — enough detail for another agent to understand and complete it'),
  activeForm: z.string().optional()
    .describe('Present continuous form shown in spinner when in_progress (e.g. "Running tests")'),
  metadata: z.record(z.unknown()).optional()
    .describe('Arbitrary key-value data to attach to the task'),
})

type Input = z.infer<typeof inputSchema>

export const TaskCreateTool: Tool<Input> = {
  name: 'TaskCreate',

  description:
    'Create a tracked task in the session task list. Use this at the start of complex ' +
    'multi-step work to break it into discrete, trackable units. ' +
    'Tasks start as pending — call TaskUpdate to mark them in_progress when you begin, ' +
    'and completed when done. Other agents can claim tasks via TaskUpdate(owner). ' +
    'Check TaskList first to avoid duplicate tasks.',

  inputSchema,

  checkPermissions(): PermissionDecision { return { type: 'allow' } },

  async call(input: Input, _ctx: ToolContext): Promise<ToolResult> {
    const task = createTask(
      input.subject,
      input.description,
      input.activeForm,
      input.metadata ?? {}
    )
    return {
      content: [{ type: 'text', text: JSON.stringify({ task: { id: task.id, subject: task.subject } }) }],
    }
  },

  toDefinition() {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object' as const,
        properties: {
          subject: { type: 'string', description: 'Brief imperative task title' },
          description: { type: 'string', description: 'Full task description' },
          activeForm: { type: 'string', description: 'Spinner text when in_progress (optional)' },
          metadata: { type: 'object', description: 'Optional key-value metadata' },
        },
        required: ['subject', 'description'],
      },
    }
  },
}
