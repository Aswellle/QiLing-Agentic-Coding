import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, ToolDefinition } from '../types/tool'

const todoItemSchema = z.object({
  id: z.string(),
  content: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed']),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
})

const inputSchema = z.object({
  todos: z.array(todoItemSchema).describe('The complete list of todos (replaces current list)'),
})

type Input = z.infer<typeof inputSchema>

// In-memory todo store per context (keyed by sessionId)
const todoStore = new Map<string, Input['todos']>()

export const TodoWriteTool: Tool<Input> = {
  name: 'TodoWrite',
  description:
    'Manage a task list for the current session. ' +
    'Pass the complete updated todos array. ' +
    'Use this to track multi-step plans and mark tasks as completed.',
  inputSchema,

  async call(input: Input, context: ToolContext): Promise<ToolResult> {
    todoStore.set(context.sessionId, input.todos)

    const summary = input.todos.map(t => {
      const icon = t.status === 'completed' ? '✓' : t.status === 'in_progress' ? '⟳' : '○'
      const priority = t.priority === 'high' ? ' [!]' : ''
      return `${icon} ${t.content}${priority}`
    }).join('\n')

    return {
      content: [{
        type: 'text',
        text: `Todo list updated (${input.todos.length} items):\n${summary}`,
      }],
    }
  },

  toDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          todos: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                content: { type: 'string' },
                status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
                priority: { type: 'string', enum: ['high', 'medium', 'low'], default: 'medium' },
              },
              required: ['id', 'content', 'status'],
            },
          },
        },
        required: ['todos'],
      },
    }
  },
}

export function getTodos(sessionId: string): Input['todos'] {
  return todoStore.get(sessionId) ?? []
}
