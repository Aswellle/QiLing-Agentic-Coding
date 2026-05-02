import { z } from 'zod'
import type { Tool, ToolResult, ToolContext, PermissionDecision } from '../types/tool'

export const ENTER_PLAN_MODE_TOOL_NAME = 'EnterPlanMode'

const inputSchema = z.object({}).describe('No input required')

export const EnterPlanModeTool: Tool<Record<string, never>> = {
  name: ENTER_PLAN_MODE_TOOL_NAME,

  description:
    'Switch to Plan Mode — a read-only exploration phase where you can analyze the codebase, ' +
    'understand requirements, and design an approach WITHOUT making any file changes. ' +
    'Use this when you face complex tasks requiring upfront planning: ' +
    'architectural decisions, multi-file refactors, ambiguous requirements, or tasks ' +
    'where rushing into code changes would be risky. ' +
    'In Plan Mode only FileRead, Glob, Grep, WebFetch, and WebSearch are available. ' +
    'When your plan is ready, call ExitPlanMode to present it to the user for approval.',

  inputSchema,

  checkPermissions(_input: Record<string, never>): PermissionDecision {
    return { type: 'allow' }
  },

  async call(_input: Record<string, never>, _context: ToolContext): Promise<ToolResult> {
    // The actual mode switch is handled by query.ts intercepting this tool call
    // and invoking the onEnterPlanMode callback before calling tool.call().
    // By the time we reach here, REPL is already in plan mode.
    return {
      content: [{
        type: 'text',
        text: [
          'Entered Plan Mode. You are now in read-only exploration.',
          '',
          'Available tools: FileRead, Glob, Grep, WebFetch, WebSearch, TodoWrite, NotebookRead',
          'Disabled: FileEdit, FileWrite, Bash, PowerShell, Agent',
          '',
          'Explore the codebase, design your approach, then call ExitPlanMode with your complete plan.',
        ].join('\n'),
      }],
    }
  },

  toDefinition() {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object' as const,
        properties: {},
        required: [],
      },
    }
  },
}
