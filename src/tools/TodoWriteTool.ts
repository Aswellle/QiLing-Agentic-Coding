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
  description: `Use this tool to create and manage a structured task list for your current coding session. This helps you track progress, organize complex tasks, and demonstrate thoroughness to the user.

## When to Use This Tool

Use this tool proactively in these scenarios:
- Complex multi-step tasks — When a task requires 3 or more distinct steps
- Non-trivial tasks requiring careful planning or multiple operations
- User explicitly requests todo list
- User provides multiple tasks (numbered or comma-separated)
- After receiving new instructions — immediately capture requirements as todos
- When you start working on a task — mark it as in_progress BEFORE beginning
- After completing a task — mark it as completed and add follow-up tasks

## When NOT to Use This Tool

Skip using this tool when:
- There is only a single, straightforward task
- The task is trivial and tracking provides no organizational benefit
- The task can be completed in less than 3 trivial steps
- The task is purely conversational or informational

NOTE: Do not use this tool if there is only one trivial task — just do it directly.`,
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
