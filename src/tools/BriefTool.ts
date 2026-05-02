import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'
import { getBrief, setBrief, clearBrief } from '../services/brief/store'

const inputSchema = z.object({
  action: z.enum(['get', 'set', 'clear'])
    .describe(
      'get = read the current session brief\n' +
      'set = write a new brief (replaces existing)\n' +
      'clear = remove the brief'
    ),
  brief: z.string().optional()
    .describe(
      'The brief content (required for set). ' +
      'Summarise the current task: what you are doing, key constraints, current state, next steps. ' +
      'This is injected at the top of the system prompt and survives context compression.'
    ),
})

type Input = z.infer<typeof inputSchema>

export const BriefTool: Tool<Input> = {
  name: 'Brief',

  description:
    'Manage the session brief — a short task description injected into the system prompt that ' +
    'persists across context compression. ' +
    'Use action="set" at the start of a complex task to record: what you\'re doing, key constraints, ' +
    'and the current state. When the conversation is later compacted, the brief ensures you retain ' +
    'the mission context. ' +
    'Use action="get" to check the current brief. ' +
    'Use action="clear" when the task is complete.',

  inputSchema,

  checkPermissions(): PermissionDecision { return { type: 'allow' } },

  async call(input: Input, _ctx: ToolContext): Promise<ToolResult> {
    switch (input.action) {
      case 'get': {
        const brief = getBrief()
        return {
          content: [{
            type: 'text',
            text: brief
              ? `Current brief:\n\n${brief}`
              : 'No brief set. Use Brief(action="set", brief="...") to set one.',
          }],
        }
      }
      case 'set': {
        if (!input.brief?.trim()) {
          return {
            content: [{ type: 'text', text: 'Error: brief content is required for set' }],
            isError: true,
          }
        }
        setBrief(input.brief)
        return {
          content: [{
            type: 'text',
            text: `Brief set. It will be injected into the system prompt for this session:\n\n${input.brief.trim()}`,
          }],
        }
      }
      case 'clear': {
        clearBrief()
        return { content: [{ type: 'text', text: 'Brief cleared.' }] }
      }
    }
  },

  toDefinition() {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object' as const,
        properties: {
          action: { type: 'string', enum: ['get', 'set', 'clear'] },
          brief: { type: 'string', description: 'Brief content (required for set)' },
        },
        required: ['action'],
      },
    }
  },
}
